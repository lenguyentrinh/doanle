import { AppDataSource } from '../data-source';
import { Product } from '../../modules/products/entities/product.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { toSlug } from '../../common/utils/string.utils';
import { productSeeds } from './product.seed';

/**
 * Idempotent product seeder.
 * Run with: `npm run seed`
 *
 * Skips products whose `name` already exists, so re-running is safe and only
 * inserts the missing rows. Categories are upserted by name first (also
 * idempotent) so every seed product resolves to a real `categoryId`.
 */
async function seed(): Promise<void> {
  await AppDataSource.initialize();
  console.log('📦 Data source initialised — seeding products...');

  const categoryRepo = AppDataSource.getRepository(Category);
  const repo = AppDataSource.getRepository(Product);

  const categoryNames = [...new Set(productSeeds.map((p) => p.category))];
  const existingCategories = await categoryRepo.find();
  const categoryIdByName = new Map(
    existingCategories.map((c) => [c.name, c.id]),
  );

  const missingCategories = categoryNames.filter(
    (name) => !categoryIdByName.has(name),
  );
  if (missingCategories.length > 0) {
    const created = await categoryRepo.save(
      categoryRepo.create(
        missingCategories.map((name) => ({ name, slug: toSlug(name) })),
      ),
    );
    for (const c of created) categoryIdByName.set(c.name, c.id);
    console.log(`✅ Inserted ${created.length} category(ies).`);
  }

  const existing = await repo.find({ select: { name: true } });
  const existingNames = new Set(existing.map((p) => p.name));

  const toInsert = productSeeds
    .filter((p) => !existingNames.has(p.name))
    .map(({ category, ...rest }) => ({
      ...rest,
      categoryId: categoryIdByName.get(category)!,
    }));

  if (toInsert.length === 0) {
    console.log('✅ All seed products already exist — nothing to insert.');
  } else {
    const entities = repo.create(toInsert);
    await repo.save(entities);
    console.log(`✅ Inserted ${toInsert.length} product(s).`);
  }

  const total = await repo.count();
  console.log(`📊 Products table now holds ${total} row(s).`);

  await AppDataSource.destroy();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
