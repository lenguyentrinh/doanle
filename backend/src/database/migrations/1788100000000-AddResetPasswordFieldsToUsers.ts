import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResetPasswordFieldsToUsers1788100000000
  implements MigrationInterface
{
  name = 'AddResetPasswordFieldsToUsers1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    // Legacy column predates migrations; user.entity.ts has always used `createAt`.
    if (
      table?.findColumnByName('createdAt') &&
      !table?.findColumnByName('createAt')
    ) {
      await queryRunner.query(
        `ALTER TABLE \`users\` CHANGE \`createdAt\` \`createAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
    }

    if (!table?.findColumnByName('resetPasswordToken')) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`resetPasswordToken\` varchar(255) NULL`,
      );
    }

    if (!table?.findColumnByName('resetPasswordExpired')) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`resetPasswordExpired\` timestamp NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');

    if (table?.findColumnByName('resetPasswordExpired')) {
      await queryRunner.query(
        `ALTER TABLE \`users\` DROP COLUMN \`resetPasswordExpired\``,
      );
    }

    if (table?.findColumnByName('resetPasswordToken')) {
      await queryRunner.query(
        `ALTER TABLE \`users\` DROP COLUMN \`resetPasswordToken\``,
      );
    }

    if (
      table?.findColumnByName('createAt') &&
      !table?.findColumnByName('createdAt')
    ) {
      await queryRunner.query(
        `ALTER TABLE \`users\` CHANGE \`createAt\` \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
    }
  }
}
