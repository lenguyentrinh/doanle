import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRefreshTokens1788600000000 implements MigrationInterface {
  name = 'CreateRefreshTokens1788600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable('refresh_tokens');
    if (hasTable) return;

    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'user_id',
            type: 'int',
          },
          {
            name: 'token_hash',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'is_revoked',
            type: 'tinyint',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('refresh_tokens');
  }
}
