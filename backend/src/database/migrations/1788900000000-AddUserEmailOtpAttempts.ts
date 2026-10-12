import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserEmailOtpAttempts1788900000000
  implements MigrationInterface
{
  name = 'AddUserEmailOtpAttempts1788900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const col = table.findColumnByName('email_otp_attempts');
    if (!col) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD \`email_otp_attempts\` int NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const col = table.findColumnByName('email_otp_attempts');
    if (col) {
      await queryRunner.query(
        `ALTER TABLE \`users\` DROP COLUMN \`email_otp_attempts\``,
      );
    }
  }
}
