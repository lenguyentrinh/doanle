import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model } from 'mongoose';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { RefreshToken } from './entities/refresh-token.entity';
import { runInTransaction } from '../../common/database/transaction';
import { isObjectIdString } from '../../common/pipes/parse-object-id.pipe';

interface RotateResult {
  userId: string;
  raw: string;
}

type RotateOutcome =
  | { kind: 'expired' | 'raced' }
  | { kind: 'reused'; userId: string }
  | { kind: 'rotated'; userId: string; raw: string };

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
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
    @InjectConnection()
    private connection: Connection,
    private configService: ConfigService,
  ) {
    this.refreshExpiresIn =
      this.configService.get<string>('jwtRefresh.expiresIn') ?? '7d';
  }

  // Raw tokens are opaque (not JWTs): `${rowId}.${secret}` (rowId = ObjectId
  // hex). The id lets a refresh look up its exact row directly instead of
  // scanning every live token for the user, and lets us tell "expired" apart
  // from "reused" (a genuinely reused token matches a row that is already
  // isRevoked).
  private generateSecret(): string {
    return randomBytes(48).toString('hex');
  }

  private parseRawToken(
    rawToken: string,
  ): { id: string; secret: string } | null {
    const separatorIndex = rawToken.indexOf('.');
    if (separatorIndex <= 0) return null;
    const id = rawToken.slice(0, separatorIndex);
    const secret = rawToken.slice(separatorIndex + 1);
    if (!isObjectIdString(id) || !secret) return null;
    return { id, secret };
  }

  async createRefreshToken(userId: string): Promise<string> {
    const secret = this.generateSecret();
    const hash = await bcrypt.hash(secret, 10);
    const expiresAt = new Date(
      Date.now() + this.parseExpiresIn(this.refreshExpiresIn),
    );

    const saved = await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      tokenHash: hash,
      expiresAt,
    });

    return `${saved.id}.${secret}`;
  }

  // Verifies + rotates a refresh token. Never throws from inside the
  // transaction on the "reuse detected" path — revoking every token for the
  // user must survive even though we go on to reject this request, and a
  // transaction callback that throws rolls back everything it did.
  //
  // Concurrency: the old row is claimed with an atomic conditional update
  // (`isRevoked: false` -> true) inside a transaction together with the
  // insert of the replacement, so exactly one of N concurrent rotations of
  // the same token wins; the rest observe the claim as lost and are treated
  // as a benign race (or reuse, if outside the grace window).
  async rotateRefreshToken(rawToken: string): Promise<RotateResult> {
    const parsed = this.parseRawToken(rawToken);
    if (!parsed) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const token = await this.refreshTokenModel.findById(parsed.id);
    if (!token || !(await bcrypt.compare(parsed.secret, token.tokenHash))) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    const userId = token.userId.toString();
    const classifyRevoked = (revokedAt: Date | null): RotateOutcome => {
      const revokedMsAgo = revokedAt
        ? Date.now() - revokedAt.getTime()
        : Infinity;
      return revokedMsAgo < REUSE_GRACE_WINDOW_MS
        ? { kind: 'raced' }
        : { kind: 'reused', userId };
    };

    let outcome: RotateOutcome;
    if (token.isRevoked) {
      outcome = classifyRevoked(token.revokedAt);
    } else if (token.expiresAt < new Date()) {
      outcome = { kind: 'expired' };
    } else {
      const newSecret = this.generateSecret();
      const newHash = await bcrypt.hash(newSecret, 10);
      const expiresAt = new Date(
        Date.now() + this.parseExpiresIn(this.refreshExpiresIn),
      );
      const replacementId = new Types.ObjectId();

      outcome = await runInTransaction<RotateOutcome>(
        this.connection,
        async (session) => {
          const claimed = await this.refreshTokenModel.findOneAndUpdate(
            { _id: token._id, isRevoked: false },
            {
              $set: {
                isRevoked: true,
                revokedAt: new Date(),
                replacedByTokenId: replacementId,
              },
            },
            { session },
          );
          if (!claimed) {
            // Lost the race: another request revoked it between our read and
            // this update. Re-read to decide raced vs. reused.
            const current = await this.refreshTokenModel
              .findById(token._id)
              .session(session);
            return classifyRevoked(current?.revokedAt ?? null);
          }

          await this.refreshTokenModel.create(
            [
              {
                _id: replacementId,
                userId: token.userId,
                tokenHash: newHash,
                expiresAt,
              },
            ],
            { session },
          );
          return {
            kind: 'rotated',
            userId,
            raw: `${replacementId.toHexString()}.${newSecret}`,
          };
        },
      );
    }

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

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } },
    );
  }

  async revokeByRawToken(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const parsed = this.parseRawToken(rawToken);
    if (!parsed) return;
    const token = await this.refreshTokenModel.findById(parsed.id);
    if (!token) return;
    await this.revokeAllUserTokens(token.userId.toString());
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired(): Promise<void> {
    const result = await this.refreshTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    if (result.deletedCount > 0) {
      this.logger.log(
        `Cleaned up ${result.deletedCount} expired refresh tokens`,
      );
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
