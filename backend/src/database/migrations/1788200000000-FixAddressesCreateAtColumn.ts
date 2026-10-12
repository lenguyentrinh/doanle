import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAddressesCreateAtColumn1788200000000
  implements MigrationInterface
{
  name = 'FixAddressesCreateAtColumn1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('addresses');

    if (
      table?.findColumnByName('createdAt') &&
      !table?.findColumnByName('createAt')
    ) {
      await queryRunner.query(
        `ALTER TABLE \`addresses\` CHANGE \`createdAt\` \`createAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('addresses');

    if (
      table?.findColumnByName('createAt') &&
      !table?.findColumnByName('createdAt')
    ) {
      await queryRunner.query(
        `ALTER TABLE \`addresses\` CHANGE \`createAt\` \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      );
    }
  }
}
