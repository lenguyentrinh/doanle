import { MigrationInterface, QueryRunner } from 'typeorm';

// `payment_reference` is never queried by (only written as null and read back
// to derive paymentStatus — see orders.service.ts / orders-admin.service.ts),
// so this index is dead weight under the current Cash-on-Delivery model.
export class DropOrdersPaymentReferenceIndex1788300000000
  implements MigrationInterface
{
  name = 'DropOrdersPaymentReferenceIndex1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    const hasIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_payment_reference',
    );
    if (hasIndex) {
      await queryRunner.query(
        'DROP INDEX `idx_orders_payment_reference` ON `orders`',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    const hasIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_payment_reference',
    );
    if (!hasIndex) {
      await queryRunner.query(
        'CREATE INDEX `idx_orders_payment_reference` ON `orders` (`payment_reference`)',
      );
    }
  }
}
