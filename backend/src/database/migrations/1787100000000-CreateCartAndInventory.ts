import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCartAndInventory1787100000000 implements MigrationInterface {
  name = 'CreateCartAndInventory1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cartItems = await queryRunner.getTable('cart_items');
    if (!cartItems) {
      await queryRunner.query(
        `CREATE TABLE \`cart_items\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`user_id\` int NOT NULL,
          \`product_id\` int NOT NULL,
          \`quantity\` int NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_cart_items_user_product\` (\`user_id\`, \`product_id\`),
          KEY \`idx_cart_items_user_id\` (\`user_id\`),
          KEY \`idx_cart_items_product_id\` (\`product_id\`),
          CONSTRAINT \`fk_cart_items_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_cart_items_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB`,
      );
    }

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    const inventoryReserves = await queryRunner.getTable('inventory_reserves');
    if (inventoryReserves) {
      await queryRunner.query(`DROP TABLE \`inventory_reserves\``);
    }

    const cartItems = await queryRunner.getTable('cart_items');
    if (cartItems) {
      await queryRunner.query(`DROP TABLE \`cart_items\``);
    }
  }
}
