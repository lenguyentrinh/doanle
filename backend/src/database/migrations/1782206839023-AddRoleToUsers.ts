import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUsers1782206839023 implements MigrationInterface {
  name = 'AddRoleToUsers1782206839023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table?.findColumnByName('role')) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`role\` ENUM('customer', 'admin') NOT NULL DEFAULT 'customer'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (table?.findColumnByName('role')) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`role\``);
    }
  }
}
