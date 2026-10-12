import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

// Slugify is inlined (not imported from common/utils) — migrations must stay
// self-contained and immune to future changes in app-level utilities.
function toSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class CreateCategoriesAndBackfillProducts1789100000000
  implements MigrationInterface
{
  name = 'CreateCategoriesAndBackfillProducts1789100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const categoriesTable = await queryRunner.getTable('categories');
    if (!categoriesTable) {
      await queryRunner.query(`
        CREATE TABLE \`categories\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(100) NOT NULL,
          \`slug\` varchar(120) NOT NULL,
          \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`idx_categories_name\` (\`name\`),
          UNIQUE INDEX \`idx_categories_slug\` (\`slug\`)
        ) ENGINE=InnoDB
      `);
    }

    const distinctCategories = (await queryRunner.query(
      `SELECT DISTINCT \`category\` FROM \`products\``,
    )) as { category: string }[];
    for (const row of distinctCategories) {
      const existing = (await queryRunner.query(
        `SELECT id FROM \`categories\` WHERE \`name\` = ?`,
        [row.category],
      )) as { id: number }[];
      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO \`categories\` (\`name\`, \`slug\`) VALUES (?, ?)`,
          [row.category, toSlug(row.category)],
        );
      }
    }

    const productsTable = await queryRunner.getTable('products');
    const hasCategoryId = productsTable?.columns.some(
      (c) => c.name === 'category_id',
    );
    if (!hasCategoryId) {
      await queryRunner.query(
        `ALTER TABLE \`products\` ADD COLUMN \`category_id\` int NULL`,
      );
      await queryRunner.query(`
        UPDATE \`products\` p
        JOIN \`categories\` c ON c.\`name\` = p.\`category\`
        SET p.\`category_id\` = c.\`id\`
      `);
      await queryRunner.query(
        `ALTER TABLE \`products\` MODIFY \`category_id\` int NOT NULL`,
      );
      await queryRunner.query(
        `DROP INDEX \`idx_products_category\` ON \`products\``,
      );
      await queryRunner.query(
        `CREATE INDEX \`idx_products_category_id\` ON \`products\` (\`category_id\`)`,
      );
      await queryRunner.createForeignKey(
        'products',
        new TableForeignKey({
          columnNames: ['category_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'categories',
          onDelete: 'RESTRICT',
        }),
      );
      await queryRunner.query(
        `ALTER TABLE \`products\` DROP COLUMN \`category\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const productsTable = await queryRunner.getTable('products');
    const hasCategoryId = productsTable?.columns.some(
      (c) => c.name === 'category_id',
    );
    if (hasCategoryId) {
      await queryRunner.query(
        `ALTER TABLE \`products\` ADD COLUMN \`category\` varchar(255) NULL`,
      );
      await queryRunner.query(`
        UPDATE \`products\` p
        JOIN \`categories\` c ON c.\`id\` = p.\`category_id\`
        SET p.\`category\` = c.\`name\`
      `);
      await queryRunner.query(
        `ALTER TABLE \`products\` MODIFY \`category\` varchar(255) NOT NULL`,
      );

      const fk = productsTable!.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('category_id') !== -1,
      );
      if (fk) {
        await queryRunner.dropForeignKey('products', fk);
      }
      await queryRunner.query(
        `DROP INDEX \`idx_products_category_id\` ON \`products\``,
      );
      await queryRunner.query(
        `CREATE INDEX \`idx_products_category\` ON \`products\` (\`category\`)`,
      );
      await queryRunner.query(
        `ALTER TABLE \`products\` DROP COLUMN \`category_id\``,
      );
    }

    const categoriesTable = await queryRunner.getTable('categories');
    if (categoriesTable) {
      await queryRunner.query(`DROP TABLE \`categories\``);
    }
  }
}
