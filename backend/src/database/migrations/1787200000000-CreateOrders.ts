import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1787200000000 implements MigrationInterface {
  name = 'CreateOrders1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const orders = await queryRunner.getTable('orders');
    if (!orders) {
      await queryRunner.query(
        `CREATE TABLE \`orders\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`user_id\` int NOT NULL,
          \`status\` enum('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
          \`subtotal\` decimal(10,2) NOT NULL,
          \`shipping_fee\` decimal(10,2) NOT NULL DEFAULT '5.00',
          \`tax\` decimal(10,2) NOT NULL,
          \`total\` decimal(10,2) NOT NULL,
          \`shipping_address\` json NOT NULL,
          \`payment_reference\` varchar(255) NULL,
          \`idempotency_key\` varchar(255) NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_orders_user_idempotency_key\` (\`user_id\`, \`idempotency_key\`),
          KEY \`idx_orders_user_id\` (\`user_id\`),
          KEY \`idx_orders_payment_reference\` (\`payment_reference\`),
          CONSTRAINT \`fk_orders_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB`,
      );
    }

    const orderItems = await queryRunner.getTable('order_items');
    if (!orderItems) {
      await queryRunner.query(
        `CREATE TABLE \`order_items\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`order_id\` int NOT NULL,
          \`product_id\` int NOT NULL,
          \`product_name\` varchar(255) NOT NULL,
          \`price\` decimal(10,2) NOT NULL,
          \`quantity\` int NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`idx_order_items_order_id\` (\`order_id\`),
          KEY \`idx_order_items_product_id\` (\`product_id\`),
          CONSTRAINT \`fk_order_items_order\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_order_items_product\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const orderItems = await queryRunner.getTable('order_items');
    if (orderItems) {
      await queryRunner.query(`DROP TABLE \`order_items\``);
    }

    const orders = await queryRunner.getTable('orders');
    if (orders) {
      await queryRunner.query(`DROP TABLE \`orders\``);
    }
  }
}
