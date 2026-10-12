import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { CategorySchema } from '../../modules/categories/entities/category.entity';
import { ProductSchema } from '../../modules/products/entities/product.entity';
import { OrderSchema } from '../../modules/orders/entities/order.entity';
import { toSlug } from '../../common/utils/string.utils';
import { DEFAULT_MONGODB_URI } from '../database.config';
import { productSeeds } from './product.seed';
import type { ProductSeed } from './product.seed';
import { orenProductSeeds } from './oren-products.seed';

dotenv.config();

/**
 * Idempotent product seeder.
 * Run with: `pnpm seed`            (default catalogue, additive)
 *           `pnpm seed:oren`       (Oren catalogue, REPLACES all products)
 *
 * Default mode skips products whose `name` already exists, so re-running is
 * safe and only inserts the missing documents. Categories are upserted by
 * name first (also idempotent) so every seed product resolves to a real
 * `categoryId`.
 *
 * `--oren` mirrors the old oren-products.sql: it clears the products
 * collection first so the category navigation reflects only that catalogue
 * (refused if any order already references products).
 */
async function seed(): Promise<void> {
  const useOren = process.argv.includes('--oren');
  const seeds: ProductSeed[] = useOren ? orenProductSeeds : productSeeds;

  const uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
  await mongoose.connect(uri);
  console.log(
    `📦 Connected to MongoDB — seeding ${useOren ? 'Oren' : 'default'} products...`,
  );

  const Category = mongoose.model('Category', CategorySchema);
  const Product = mongoose.model('Product', ProductSchema);
  const Order = mongoose.model('Order', OrderSchema);

  // Make sure the unique indexes (category name/slug, ...) exist before
  // upserting against them.
  await Promise.all([Category.init(), Product.init()]);

  if (useOren) {
    if ((await Order.estimatedDocumentCount()) > 0) {
      throw new Error(
        'Refusing to replace the product catalogue: orders already reference products.',
      );
    }
    const removed = await Product.deleteMany({});
    console.log(`🧹 Removed ${removed.deletedCount} existing product(s).`);
  }

  const categoryNames = [...new Set(seeds.map((p) => p.category))];
  const categoryIdByName = new Map<string, mongoose.Types.ObjectId>();
  for (const name of categoryNames) {
    const category = await Category.findOneAndUpdate(
      { name },
      { $setOnInsert: { name, slug: toSlug(name) } },
      { upsert: true, returnDocument: 'after' },
    );
    categoryIdByName.set(name, category._id);
  }
  console.log(`✅ ${categoryNames.length} category(ies) ensured.`);

  const existing = await Product.find({}, { name: 1 }).lean();
  const existingNames = new Set(existing.map((p) => p.name));

  const toInsert = seeds
    .filter((p) => !existingNames.has(p.name))
    .map(({ category, ...rest }) => ({
      ...rest,
      categoryId: categoryIdByName.get(category)!,
    }));

  if (toInsert.length === 0) {
    console.log('✅ All seed products already exist — nothing to insert.');
  } else {
    await Product.insertMany(toInsert);
    console.log(`✅ Inserted ${toInsert.length} product(s).`);
  }

  const total = await Product.countDocuments();
  console.log(`📊 Products collection now holds ${total} document(s).`);

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
