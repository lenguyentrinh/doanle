import { MigrationInterface, QueryRunner } from 'typeorm';

// Story 4.4: the order-detail status timeline needs to know *when* an order
// reached each status. `orders` previously had only `status` (mutable) and
// `updatedAt` (overwritten on every save) — neither can answer "when did this
// order become confirmed" once a second transition happens. Adds three
// nullable per-transition timestamps; only `confirmedAt` is populated today.
export class AddOrderStatusTimestamps1788000000000
  implements MigrationInterface
{
  name = 'AddOrderStatusTimestamps1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasConfirmedAt = await queryRunner.hasColumn(
      'orders',
      'confirmed_at',
    );
    if (!hasConfirmedAt) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` ADD \`confirmed_at\` timestamp NULL`,
      );
    }

    const hasShippedAt = await queryRunner.hasColumn('orders', 'shipped_at');
    if (!hasShippedAt) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` ADD \`shipped_at\` timestamp NULL`,
      );
    }

    const hasDeliveredAt = await queryRunner.hasColumn(
      'orders',
      'delivered_at',
    );
    if (!hasDeliveredAt) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` ADD \`delivered_at\` timestamp NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasDeliveredAt = await queryRunner.hasColumn(
      'orders',
      'delivered_at',
    );
    if (hasDeliveredAt) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` DROP COLUMN \`delivered_at\``,
      );
    }

    const hasShippedAt = await queryRunner.hasColumn('orders', 'shipped_at');
    if (hasShippedAt) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` DROP COLUMN \`shipped_at\``,
      );
    }

    const hasConfirmedAt = await queryRunner.hasColumn(
      'orders',
      'confirmed_at',
    );
    if (hasConfirmedAt) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` DROP COLUMN \`confirmed_at\``,
      );
    }
  }
}
