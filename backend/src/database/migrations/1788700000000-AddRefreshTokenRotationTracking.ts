import { MigrationInterface, QueryRunner } from 'typeorm';

// Refresh-token rotation race (multiple tabs/requests refreshing at once with
// the same not-yet-rotated token): the row that loses the race sees
// `isRevoked = true` set by the winner and, with no way to tell "just rotated
// a moment ago by a legitimate request" apart from "replayed after a real
// theft", gets treated as reuse — triggering revoke-all-tokens and logging
// out every device for a benign race. `revoked_at` lets rotateRefreshToken
// apply a short grace window before treating a revoked token as reuse.
// `replaced_by_token_id` records which row a rotation produced, for
// diagnosing rotation chains; not read by the grace-window check itself.
export class AddRefreshTokenRotationTracking1788700000000
  implements MigrationInterface
{
  name = 'AddRefreshTokenRotationTracking1788700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasRevokedAt = await queryRunner.hasColumn(
      'refresh_tokens',
      'revoked_at',
    );
    if (!hasRevokedAt) {
      await queryRunner.query(
        `ALTER TABLE \`refresh_tokens\` ADD \`revoked_at\` timestamp NULL`,
      );
    }

    const hasReplacedByTokenId = await queryRunner.hasColumn(
      'refresh_tokens',
      'replaced_by_token_id',
    );
    if (!hasReplacedByTokenId) {
      await queryRunner.query(
        `ALTER TABLE \`refresh_tokens\` ADD \`replaced_by_token_id\` int NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasReplacedByTokenId = await queryRunner.hasColumn(
      'refresh_tokens',
      'replaced_by_token_id',
    );
    if (hasReplacedByTokenId) {
      await queryRunner.query(
        `ALTER TABLE \`refresh_tokens\` DROP COLUMN \`replaced_by_token_id\``,
      );
    }

    const hasRevokedAt = await queryRunner.hasColumn(
      'refresh_tokens',
      'revoked_at',
    );
    if (hasRevokedAt) {
      await queryRunner.query(
        `ALTER TABLE \`refresh_tokens\` DROP COLUMN \`revoked_at\``,
      );
    }
  }
}
