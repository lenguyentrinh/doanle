import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAddresses1787000000000 implements MigrationInterface {
  name = 'CreateAddresses1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('addresses');
    if (!table) {
      await queryRunner.query(
        `CREATE TABLE \`addresses\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`first_name\` varchar(255) NOT NULL,
          \`last_name\` varchar(255) NOT NULL,
          \`street\` varchar(255) NOT NULL,
          \`city\` varchar(255) NOT NULL,
          \`is_default\` tinyint NOT NULL DEFAULT 0,
          \`user_id\` int NOT NULL,
          \`createAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_addresses_user_id\` (\`user_id\`),
          CONSTRAINT \`fk_addresses_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('addresses');
    if (table) {
      await queryRunner.query(`DROP TABLE \`addresses\``);
    }
  }
}
