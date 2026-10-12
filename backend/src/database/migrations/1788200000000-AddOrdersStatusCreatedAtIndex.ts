import { MigrationInterface, QueryRunner } from 'typeorm';

// Admin order list (findAllForAdmin) filters by `status` and sorts by
// `createdAt`; the dashboard's monthly-revenue query filters by `confirmedAt`
// alone. Neither had a supporting index before this migration.
export class AddOrdersStatusCreatedAtIndex1788200000000
  implements MigrationInterface
{
  name = 'AddOrdersStatusCreatedAtIndex1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');

    const hasStatusCreatedAtIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_status_created_at',
    );
    if (!hasStatusCreatedAtIndex) {
      await queryRunner.query(
        'CREATE INDEX `idx_orders_status_created_at` ON `orders` (`status`, `createdAt`)',
      );
    }

    const hasConfirmedAtIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_confirmed_at',
    );
    if (!hasConfirmedAtIndex) {
      await queryRunner.query(
        'CREATE INDEX `idx_orders_confirmed_at` ON `orders` (`confirmed_at`)',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');

    const hasConfirmedAtIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_confirmed_at',
    );
    if (hasConfirmedAtIndex) {
      await queryRunner.query(
        'DROP INDEX `idx_orders_confirmed_at` ON `orders`',
      );
    }

    const hasStatusCreatedAtIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_status_created_at',
    );
    if (hasStatusCreatedAtIndex) {
      await queryRunner.query(
        'DROP INDEX `idx_orders_status_created_at` ON `orders`',
      );
    }
  }
}
