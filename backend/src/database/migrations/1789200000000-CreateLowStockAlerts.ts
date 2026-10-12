import { MigrationInterface, QueryRunner } from 'typeorm';

// Backing table for InventoryModule (see
// ../../modules/inventory/entities/low-stock-alert.entity.ts). No FK to
// orders/products — it's a standalone alert log, not a joined view.
export class CreateLowStockAlerts1789200000000 implements MigrationInterface {
  name = 'CreateLowStockAlerts1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('low_stock_alerts');
    if (!table) {
      await queryRunner.query(
        `CREATE TABLE \`low_stock_alerts\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`order_id\` int NOT NULL,
          \`product_id\` int NOT NULL,
          \`product_name\` varchar(255) NOT NULL,
          \`remaining_stock\` int NOT NULL,
          \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_low_stock_alerts_product_id\` (\`product_id\`)
        ) ENGINE=InnoDB`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('low_stock_alerts');
    if (table) {
      await queryRunner.query(`DROP TABLE \`low_stock_alerts\``);
    }
  }
}
