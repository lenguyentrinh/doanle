import { MigrationInterface, QueryRunner } from 'typeorm';

// A prior, never-committed set of migrations (CreateRefreshTokens,
// AlterOrdersUserFkRestrict, AddUserEmailOtpAttempts, DropOrdersPaymentReferenceIndex,
// AddOrdersStatusCreatedAtIndex, and others) ran against this dev database and
// recorded themselves in the `migrations` table, but their files were never
// checked in. That left local dev databases with schema the current entities
// and committed migrations don't know about. This reconciles the schema back
// to exactly what running the committed migrations from scratch produces, and
// drops the now-orphaned history rows so `migration:show`/`migration:revert`
// aren't confused by migrations that no longer exist on disk.
export class ReconcileOrphanSchemaDrift1789000000000
  implements MigrationInterface
{
  name = 'ReconcileOrphanSchemaDrift1789000000000';

  private readonly orphanMigrationNames = [
    'DropInventoryReserves1788100000000',
    'AddOrdersStatusCreatedAtIndex1788200000000',
    'DropOrdersPaymentReferenceIndex1788300000000',
    'DropUserResetPasswordColumns1788400000000',
    'RenameCreateAtToCreatedAt1788500000000',
    'CreateRefreshTokens1788600000000',
    'AddRefreshTokenRotationTracking1788700000000',
    'AlterOrdersUserFkRestrict1788800000000',
    'AddUserEmailOtpAttempts1788900000000',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const ordersTable = await queryRunner.getTable('orders');

    const strayStatusIndex = ordersTable?.indices.find(
      (index) => index.name === 'idx_orders_status_created_at',
    );
    if (strayStatusIndex) {
      await queryRunner.query(
        `DROP INDEX \`idx_orders_status_created_at\` ON \`orders\``,
      );
    }

    const userFk = ordersTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('user_id'),
    );
    if (userFk && userFk.name !== 'fk_orders_user') {
      await queryRunner.query(
        `ALTER TABLE \`orders\` DROP FOREIGN KEY \`${userFk.name}\``,
      );
      await queryRunner.query(
        `ALTER TABLE \`orders\` ADD CONSTRAINT \`fk_orders_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE`,
      );
    }

    const hasPaymentReferenceIndex = ordersTable?.indices.some(
      (index) => index.name === 'idx_orders_payment_reference',
    );
    if (!hasPaymentReferenceIndex) {
      await queryRunner.query(
        `CREATE INDEX \`idx_orders_payment_reference\` ON \`orders\` (\`payment_reference\`)`,
      );
    }

    const hasEmailOtpAttempts = await queryRunner.hasColumn(
      'users',
      'email_otp_attempts',
    );
    if (hasEmailOtpAttempts) {
      await queryRunner.query(
        `ALTER TABLE \`users\` DROP COLUMN \`email_otp_attempts\``,
      );
    }

    const refreshTokensTable = await queryRunner.getTable('refresh_tokens');
    if (refreshTokensTable) {
      await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
    }

    await queryRunner.query(
      `DELETE FROM \`migrations\` WHERE \`name\` IN (${this.orphanMigrationNames
        .map((name) => `'${name}'`)
        .join(', ')})`,
    );
  }

  public async down(): Promise<void> {
    // Intentional no-op: this migration only reconciles a local database back
    // to what the committed migrations already describe. Reverting it would
    // just reintroduce schema that was never part of the codebase.
  }
}
