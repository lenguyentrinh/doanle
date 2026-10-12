import { MigrationInterface, QueryRunner } from 'typeorm';

// Story 4.1a (sprint-change-proposal-2026-07-01-mock-payment-gateway.md)
// renamed this column by editing the already-shipped CreateOrders migration
// in place, assuming it was still greenfield. Any database where CreateOrders
// had already run keeps the old column, and TypeORM won't re-run a migration
// it already recorded as applied — this migration reconciles those databases.
export class FixOrdersPaymentReferenceColumn1787300000000
  implements MigrationInterface
{
  name = 'FixOrdersPaymentReferenceColumn1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Column and index checks are independent (not nested) so a retry after a
    // partial failure — e.g. the column rename commits but the index rename
    // fails — still completes the index rename instead of silently no-oping
    // because `hasOldColumn` is now false.
    const hasOldColumn = await queryRunner.hasColumn(
      'orders',
      'stripe_payment_intent_id',
    );
    const hasNewColumn = await queryRunner.hasColumn(
      'orders',
      'payment_reference',
    );
    if (hasOldColumn && !hasNewColumn) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` CHANGE \`stripe_payment_intent_id\` \`payment_reference\` varchar(255) NULL`,
      );
    }

    const table = await queryRunner.getTable('orders');
    const hasOldIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_stripe_payment_intent_id',
    );
    const hasNewIndex = table?.indices.some(
      (index) => index.name === 'idx_orders_payment_reference',
    );
    if (hasOldIndex && !hasNewIndex) {
      await queryRunner.query(
        `ALTER TABLE \`orders\` RENAME INDEX \`idx_orders_stripe_payment_intent_id\` TO \`idx_orders_payment_reference\``,
      );
    }
  }

  public async down(): Promise<void> {
    // Intentional no-op: `payment_reference` is the correct, permanent name
    // (not itself a schema-shape change being reverted). Renaming it back to
    // `stripe_payment_intent_id` would break `order.entity.ts` on every
    // database that never had the drift this migration reconciles — i.e.
    // every fresh install — which is worse than leaving revert a no-op.
  }
}
