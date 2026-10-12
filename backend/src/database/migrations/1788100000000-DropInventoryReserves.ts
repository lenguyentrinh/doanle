import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropInventoryReserves1788100000000 implements MigrationInterface {
  name = 'DropInventoryReserves1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const inventoryReserves = await queryRunner.getTable('inventory_reserves');
    if (inventoryReserves) {
      await queryRunner.query(`DROP TABLE \`inventory_reserves\``);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const inventoryReserves = await queryRunner.getTable('inventory_reserves');
    if (!inventoryReserves) {
      await queryRunner.query(
        `CREATE TABLE \`inventory_reserves\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`product_id\` int NOT NULL,
          \`session_id\` varchar(255) NOT NULL,
          \`quantity\` int NOT NULL,
          \`expires_at\` datetime NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_inventory_reserves_product_id\` (\`product_id\`),
          KEY \`idx_inventory_reserves_session_id\` (\`session_id\`),
          CONSTRAINT \`fk_inventory_reserves_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB`,
      );
    }
  }
}
