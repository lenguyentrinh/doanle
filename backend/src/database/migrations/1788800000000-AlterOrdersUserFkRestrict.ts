import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AlterOrdersUserFkRestrict1788800000000
  implements MigrationInterface
{
  name = 'AlterOrdersUserFkRestrict1788800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (fk) {
      await queryRunner.dropForeignKey('orders', fk);
    }

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('orders');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (fk) {
      await queryRunner.dropForeignKey('orders', fk);
    }

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );
  }
}
