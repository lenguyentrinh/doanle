import { MigrationInterface, QueryRunner } from 'typeorm';

// `users.createAt` / `addresses.createAt` were a naming typo (missing the
// "d") baked into the original schema; renamed to the conventional
// `createdAt` to match every other timestamp column in this codebase
// (orders.createdAt, etc).
export class RenameCreateAtToCreatedAt1788500000000
  implements MigrationInterface
{
  name = 'RenameCreateAtToCreatedAt1788500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasOldUsersColumn = await queryRunner.hasColumn('users', 'createAt');
    const hasNewUsersColumn = await queryRunner.hasColumn('users', 'createdAt');
    if (hasOldUsersColumn && !hasNewUsersColumn) {
      await queryRunner.query(
        'ALTER TABLE `users` CHANGE `createAt` `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      );
    }

    const hasOldAddressesColumn = await queryRunner.hasColumn(
      'addresses',
      'createAt',
    );
    const hasNewAddressesColumn = await queryRunner.hasColumn(
      'addresses',
      'createdAt',
    );
    if (hasOldAddressesColumn && !hasNewAddressesColumn) {
      await queryRunner.query(
        'ALTER TABLE `addresses` CHANGE `createAt` `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasNewAddressesColumn = await queryRunner.hasColumn(
      'addresses',
      'createdAt',
    );
    const hasOldAddressesColumn = await queryRunner.hasColumn(
      'addresses',
      'createAt',
    );
    if (hasNewAddressesColumn && !hasOldAddressesColumn) {
      await queryRunner.query(
        'ALTER TABLE `addresses` CHANGE `createdAt` `createAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      );
    }

    const hasNewUsersColumn = await queryRunner.hasColumn('users', 'createdAt');
    const hasOldUsersColumn = await queryRunner.hasColumn('users', 'createAt');
    if (hasNewUsersColumn && !hasOldUsersColumn) {
      await queryRunner.query(
        'ALTER TABLE `users` CHANGE `createdAt` `createAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP',
      );
    }
  }
}
