-- ============================================================================
-- Oren product catalogue — INSERT seed (MySQL)
-- ============================================================================
-- Real Oren women's-fashion products (names/categories/prices sourced from the
-- Stitch "Collection-Focused Homepage" + "Shop the Collection" screens),
-- priced in VND, each mapped to a downloaded image under
--   frontend/public/images/products/<key>
--
-- PREREQUISITE: set the backend image base URL so imageKeys resolve to the new
-- folder (one line in backend/.env, then restart the API):
--   PRODUCT_IMAGE_BASE_URL=/images/products
-- (imageUrls are generated at read time as `${PRODUCT_IMAGE_BASE_URL}/${key}`.)
--
-- Columns are TypeORM camelCase; `imageKeys` is a JSON column; `price` is
-- DECIMAL(10,2); timestamps default via NOW(). `id`/`deletedAt` are omitted.
-- `category_id` is resolved via subquery against `categories.name` — the
-- `INSERT IGNORE` below seeds any category name this file needs that doesn't
-- already exist (categories are unique by name/slug, so re-running is safe).
-- ============================================================================

-- Optional: replace the old Fashion/Electronics/Lifestyle seed first so the
-- category navigation reflects only this catalogue. Comment out to append.
DELETE FROM `products`;

INSERT IGNORE INTO `categories` (`name`, `slug`)
VALUES
  ('Dresses', 'dresses'),
  ('Knitwear', 'knitwear'),
  ('Tailoring', 'tailoring'),
  ('Outerwear', 'outerwear'),
  ('Essentials', 'essentials'),
  ('Accessories', 'accessories'),
  ('Footwear', 'footwear');

INSERT INTO `products`
  (`name`, `description`, `price`, `stockQuantity`, `category_id`, `imageKeys`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('Luna Silk Maxi Dress',
   'A bias-cut silk maxi that pools and moves with you. Column silhouette, hidden side zip, finished with a fluid cowl back.',
   8900000.00, 18, (SELECT id FROM `categories` WHERE `name` = 'Dresses'),
   '["luna-silk-maxi.png", "silk-maxi.png"]', 1, NOW(), NOW()),

  ('Aria Wrap Midi Dress',
   'A softly draped silk-blend wrap in a warm ivory. Self-tie waist, deep V, and a hem that grazes the calf.',
   7900000.00, 22, (SELECT id FROM `categories` WHERE `name` = 'Dresses'),
   '["silk-maxi.png"]', 1, NOW(), NOW()),

  ('Sienna Satin Slip Dress',
   'A minimalist satin slip cut on the bias, with delicate adjustable straps. The quiet centrepiece of an evening look.',
   5500000.00, 24, (SELECT id FROM `categories` WHERE `name` = 'Dresses'),
   '["sienna-slip.png"]', 1, NOW(), NOW()),

  ('Nora Cashmere Sweater',
   'Grade-A Mongolian cashmere knit to a mid-weight gauge. Relaxed crewneck, ribbed cuffs, impossibly soft.',
   7300000.00, 30, (SELECT id FROM `categories` WHERE `name` = 'Knitwear'),
   '["nora-cashmere.png"]', 1, NOW(), NOW()),

  ('Structured Wool Blazer',
   'A double-breasted blazer in Italian wool. Defined shoulder, soft lapel, and a tailored line that layers effortlessly.',
   10900000.00, 14, (SELECT id FROM `categories` WHERE `name` = 'Tailoring'),
   '["wool-blazer.png"]', 1, NOW(), NOW()),

  ('Double-Breasted Wool Coat',
   'A longline wool coat with a generous collar and welt pockets. Built to fall straight and hold its shape through the season.',
   12500000.00, 10, (SELECT id FROM `categories` WHERE `name` = 'Outerwear'),
   '["collection-blazer.png"]', 1, NOW(), NOW()),

  ('Pleated Linen Trousers',
   'High-rise pleated trousers in a crisp washed linen. A clean break, a wide leg, and a waistband that stays put.',
   6800000.00, 40, (SELECT id FROM `categories` WHERE `name` = 'Tailoring'),
   '["pleated-trousers.png", "linen-trouser.png"]', 1, NOW(), NOW()),

  ('High-Rise Tailored Trousers',
   'A sharp, high-rise trouser with a pressed crease. Cut from a structured blend that keeps its line from desk to dinner.',
   6300000.00, 36, (SELECT id FROM `categories` WHERE `name` = 'Tailoring'),
   '["linen-trouser.png"]', 1, NOW(), NOW()),

  ('Garment-Washed Linen Shirt',
   'A breezy, garment-washed linen shirt with a relaxed collar and mother-of-pearl buttons. Your warm-weather staple.',
   3800000.00, 52, (SELECT id FROM `categories` WHERE `name` = 'Essentials'),
   '["linen-shirt.png"]', 1, NOW(), NOW()),

  ('Sculptural Gold Choker',
   'A hand-finished, gold-tone choker with an organic, sculptural form. A single statement piece that needs nothing else.',
   6200000.00, 20, (SELECT id FROM `categories` WHERE `name` = 'Accessories'),
   '["gold-choker.png"]', 1, NOW(), NOW()),

  ('Handcrafted Leather Sandals',
   'Hand-finished Spanish leather sandals on a low stacked heel. Soft footbed, minimal straps, made to be worn in.',
   7500000.00, 0, (SELECT id FROM `categories` WHERE `name` = 'Footwear'),
   '["leather-sandal.png"]', 1, NOW(), NOW());
