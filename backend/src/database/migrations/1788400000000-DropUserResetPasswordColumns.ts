import { MigrationInterface, QueryRunner } from 'typeorm';

// `resetPasswordToken`/`resetPasswordExpired` were never wired up — the
// forgot-password flow (auth.service.ts resetPassword()) verifies via
// `emailOtpCode`/`emailOtpExpires` instead, which already provide expiry and
// single-use semantics. Neither column is read or written anywhere.
export class DropUserResetPasswordColumns1788400000000
  implements MigrationInterface
{
  name = 'DropUserResetPasswordColumns1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasToken = await queryRunner.hasColumn('users', 'resetPasswordToken');
    if (hasToken) {
      await queryRunner.query(
        'ALTER TABLE `users` DROP COLUMN `resetPasswordToken`',
      );
    }

    const hasExpired = await queryRunner.hasColumn(
      'users',
      'resetPasswordExpired',
    );
    if (hasExpired) {
      await queryRunner.query(
        'ALTER TABLE `users` DROP COLUMN `resetPasswordExpired`',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasToken = await queryRunner.hasColumn('users', 'resetPasswordToken');
    if (!hasToken) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD `resetPasswordToken` varchar(255) NULL',
      );
    }

    const hasExpired = await queryRunner.hasColumn(
      'users',
      'resetPasswordExpired',
    );
    if (!hasExpired) {
      await queryRunner.query(
        'ALTER TABLE `users` ADD `resetPasswordExpired` timestamp NULL',
      );
    }
  }
}
