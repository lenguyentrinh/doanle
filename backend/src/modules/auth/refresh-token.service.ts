import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';

interface RotateResult {
  userId: number;
  raw: string;
}

// Two requests can legitimately race to rotate the same refresh token — e.g.
// several tabs of the same app all getting a 401 around the same moment and
// firing /refresh concurrently. The loser sees isRevoked = true set by the
// winner a moment ago. Only treat a revoked token as reuse (and nuke every
// session) once it's clearly outside the window a benign race would fall in.
const REUSE_GRACE_WINDOW_MS = 10_000;

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly refreshExpiresIn: string;

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private configService: ConfigService,
  ) {
    this.refreshExpiresIn =
      this.configService.get<string>('jwtRefresh.expiresIn') ?? '7d';
  }

  // Raw tokens are opaque (not JWTs): `${rowId}.${secret}`. The id lets a
  // refresh look up its exact row directly instead of scanning every live
  // token for the user, and lets us tell "expired" apart from "reused"
  // (a genuinely reused token matches a row that is already isRevoked).
  private generateSecret(): string {
    return randomBytes(48).toString('hex');
  }

  private parseRawToken(
    rawToken: string,
  ): { id: number; secret: string } | null {
    const separatorIndex = rawToken.indexOf('.');
    if (separatorIndex <= 0) return null;
    const id = Number(rawToken.slice(0, separatorIndex));
    const secret = rawToken.slice(separatorIndex + 1);
    if (!Number.isInteger(id) || !secret) return null;
    return { id, secret };
  }

  async createRefreshToken(userId: number): Promise<string> {
    const secret = this.generateSecret();
    const hash = await bcrypt.hash(secret, 10);
    const expiresAt = new Date(
      Date.now() + this.parseExpiresIn(this.refreshExpiresIn),
    );

    const saved = await this.refreshTokenRepository.save({
      userId,
      tokenHash: hash,
      expiresAt,
    });

    return `${saved.id}.${secret}`;
  }

  // Verifies + rotates a refresh token. Never throws from inside the
  // transaction on the "reuse detected" path — revoking every token for the
  // user must survive even though we go on to reject this request, and a
  // manager.transaction() callback that throws rolls back everything it did.
  async rotateRefreshToken(rawToken: string): Promise<RotateResult> {
    const parsed = this.parseRawToken(rawToken);
    if (!parsed) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const outcome = await this.refreshTokenRepository.manager.transaction(
      async (manager) => {
        const repo = manager.getRepository(RefreshToken);
        const token = await repo.findOne({
          where: { id: parsed.id },
          lock: { mode: 'pessimistic_write' },
        });

        if (!token || !(await bcrypt.compare(parsed.secret, token.tokenHash))) {
          return { kind: 'invalid' as const };
        }

        if (token.isRevoked) {
          const revokedMsAgo = token.revokedAt
            ? Date.now() - token.revokedAt.getTime()
            : Infinity;
          if (revokedMsAgo < REUSE_GRACE_WINDOW_MS) {
            return { kind: 'raced' as const };
          }
          return { kind: 'reused' as const, userId: token.userId };
        }

        if (token.expiresAt < new Date()) {
          return { kind: 'expired' as const };
        }

        const newSecret = this.generateSecret();
        const newHash = await bcrypt.hash(newSecret, 10);
        const expiresAt = new Date(
          Date.now() + this.parseExpiresIn(this.refreshExpiresIn),
        );
        const saved = await manager.save(RefreshToken, {
          userId: token.userId,
          tokenHash: newHash,
          expiresAt,
        });

        await manager.update(
          RefreshToken,
          { id: token.id },
          {
            isRevoked: true,
            revokedAt: new Date(),
            replacedByTokenId: saved.id,
          },
        );

        return {
          kind: 'rotated' as const,
          userId: token.userId,
          raw: `${saved.id}.${newSecret}`,
        };
      },
    );

    if (outcome.kind === 'reused') {
      // Committed as its own operation so it survives the rejection below —
      // a genuinely replayed token means the whole family may be compromised.
      await this.revokeAllUserTokens(outcome.userId);
      this.logger.warn(
        `Refresh token reuse detected for user ${outcome.userId} — all tokens revoked`,
      );
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    if (outcome.kind === 'raced') {
      // Within the grace window — almost certainly a losing concurrent
      // refresh (multi-tab), not an attacker. Fail this request only; the
      // request that won the race already handed its caller a fresh pair.
      this.logger.debug(
        'Refresh token rotation race detected within grace window — rejecting loser without revoking',
      );
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    if (outcome.kind !== 'rotated') {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    this.logger.log(`Refresh token rotated for user ${outcome.userId}`);
    return { userId: outcome.userId, raw: outcome.raw };
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async revokeByRawToken(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const parsed = this.parseRawToken(rawToken);
    if (!parsed) return;
    const token = await this.refreshTokenRepository.findOne({
      where: { id: parsed.id },
    });
    if (!token) return;
    await this.revokeAllUserTokens(token.userId);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired(): Promise<void> {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired refresh tokens`);
    }
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)\s*(s|m|h|d)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 3600 * 1000;
      case 'd':
        return num * 86400 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }
}
