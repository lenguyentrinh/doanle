import { MigrationInterface, QueryRunner } from 'typeorm';

// Per-product discount MVP (see OPTIMIZATION_AND_DISCOUNT_PLAN.md for the
// future promotions/vouchers direction this deliberately does not build).
// Column name is literal camelCase `discountPercentage`, not snake_case —
// this repo's naming strategy leaves TypeORM-generated column names as-is
// (see `stockQuantity`, `imageKeys`, `isActive` on this same table); only
// explicitly-named columns like `category_id` are snake_case.
export class AddDiscountPercentageToProducts1789300000000
  implements MigrationInterface
{
  name = 'AddDiscountPercentageToProducts1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('products');
    const hasColumn = table?.findColumnByName('discountPercentage');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE \`products\` ADD COLUMN \`discountPercentage\` DECIMAL(5,2) NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('products');
    const hasColumn = table?.findColumnByName('discountPercentage');
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE \`products\` DROP COLUMN \`discountPercentage\``,
      );
    }
  }
}
