import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1782300000000 implements MigrationInterface {
  name = 'CreateProducts1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('products');
    if (!table) {
      await queryRunner.query(`
        CREATE TABLE \`products\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) NOT NULL,
          \`description\` text NOT NULL,
          \`price\` decimal(10,2) NOT NULL,
          \`stockQuantity\` int NOT NULL DEFAULT 0,
          \`category\` varchar(255) NOT NULL,
          \`imageKeys\` json NOT NULL,
          \`isActive\` tinyint NOT NULL DEFAULT 1,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          \`deletedAt\` timestamp NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`idx_products_category\` (\`category\`),
          INDEX \`idx_products_isActive\` (\`isActive\`)
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('products');
    if (table) {
      await queryRunner.query(`DROP TABLE \`products\``);
    }
  }
}
