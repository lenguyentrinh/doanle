/**
 * Oren product catalogue — seed data (replaces the old oren-products.sql).
 *
 * Real Oren women's-fashion products (names/categories/prices sourced from
 * the Stitch "Collection-Focused Homepage" + "Shop the Collection" screens),
 * priced in VND, each mapped to a downloaded image under
 *   frontend/public/images/products/<key>
 *
 * PREREQUISITE: set the backend image base URL so imageKeys resolve to that
 * folder (one line in backend/.env, then restart the API):
 *   PRODUCT_IMAGE_BASE_URL=/images/products
 * (imageUrls are generated at read time as `${PRODUCT_IMAGE_BASE_URL}/${key}`.)
 *
 * Load with `pnpm seed:oren` — it replaces the existing product catalogue
 * (like the old SQL's `DELETE FROM products`) and upserts the categories
 * below by name.
 */
import type { ProductSeed } from './product.seed';

export const orenProductSeeds: ProductSeed[] = [
  {
    name: 'Luna Silk Maxi Dress',
    description:
      'A bias-cut silk maxi that pools and moves with you. Column silhouette, hidden side zip, finished with a fluid cowl back.',
    price: 8900000,
    stockQuantity: 18,
    category: 'Dresses',
    imageKeys: ['luna-silk-maxi.png', 'silk-maxi.png'],
  },
  {
    name: 'Aria Wrap Midi Dress',
    description:
      'A softly draped silk-blend wrap in a warm ivory. Self-tie waist, deep V, and a hem that grazes the calf.',
    price: 7900000,
    stockQuantity: 22,
    category: 'Dresses',
    imageKeys: ['silk-maxi.png'],
  },
  {
    name: 'Sienna Satin Slip Dress',
    description:
      'A minimalist satin slip cut on the bias, with delicate adjustable straps. The quiet centrepiece of an evening look.',
    price: 5500000,
    stockQuantity: 24,
    category: 'Dresses',
    imageKeys: ['sienna-slip.png'],
  },
  {
    name: 'Nora Cashmere Sweater',
    description:
      'Grade-A Mongolian cashmere knit to a mid-weight gauge. Relaxed crewneck, ribbed cuffs, impossibly soft.',
    price: 7300000,
    stockQuantity: 30,
    category: 'Knitwear',
    imageKeys: ['nora-cashmere.png'],
  },
  {
    name: 'Structured Wool Blazer',
    description:
      'A double-breasted blazer in Italian wool. Defined shoulder, soft lapel, and a tailored line that layers effortlessly.',
    price: 10900000,
    stockQuantity: 14,
    category: 'Tailoring',
    imageKeys: ['wool-blazer.png'],
  },
  {
    name: 'Double-Breasted Wool Coat',
    description:
      'A longline wool coat with a generous collar and welt pockets. Built to fall straight and hold its shape through the season.',
    price: 12500000,
    stockQuantity: 10,
    category: 'Outerwear',
    imageKeys: ['collection-blazer.png'],
  },
  {
    name: 'Pleated Linen Trousers',
    description:
      'High-rise pleated trousers in a crisp washed linen. A clean break, a wide leg, and a waistband that stays put.',
    price: 6800000,
    stockQuantity: 40,
    category: 'Tailoring',
    imageKeys: ['pleated-trousers.png', 'linen-trouser.png'],
  },
  {
    name: 'High-Rise Tailored Trousers',
    description:
      'A sharp, high-rise trouser with a pressed crease. Cut from a structured blend that keeps its line from desk to dinner.',
    price: 6300000,
    stockQuantity: 36,
    category: 'Tailoring',
    imageKeys: ['linen-trouser.png'],
  },
  {
    name: 'Garment-Washed Linen Shirt',
    description:
      'A breezy, garment-washed linen shirt with a relaxed collar and mother-of-pearl buttons. Your warm-weather staple.',
    price: 3800000,
    stockQuantity: 52,
    category: 'Essentials',
    imageKeys: ['linen-shirt.png'],
  },
  {
    name: 'Sculptural Gold Choker',
    description:
      'A hand-finished, gold-tone choker with an organic, sculptural form. A single statement piece that needs nothing else.',
    price: 6200000,
    stockQuantity: 20,
    category: 'Accessories',
    imageKeys: ['gold-choker.png'],
  },
  {
    name: 'Handcrafted Leather Sandals',
    description:
      'Hand-finished Spanish leather sandals on a low stacked heel. Soft footbed, minimal straps, made to be worn in.',
    price: 7500000,
    stockQuantity: 0,
    category: 'Footwear',
    imageKeys: ['leather-sandal.png'],
  },
];
