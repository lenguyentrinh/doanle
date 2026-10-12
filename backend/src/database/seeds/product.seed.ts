/**
 * Seed data for the product catalogue.
 *
 * `imageKeys` are storage object keys only (filenames). They resolve to the
 * local placeholder SVG under `frontend/public/images/placeholders/` via the
 * read-time URL generation in ProductsService (PRODUCT_IMAGE_BASE_URL must be
 * "/images/placeholders" for this seed — the separate oren-products.seed.ts catalogue
 * needs "/images/products" instead; only run one against a given base URL).
 *
 * Deliberately one placeholder shared by every category rather than one file
 * per category: a per-category placeholder silently has no image the moment
 * a new category is added.
 */
export interface ProductSeed {
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  category: string;
  imageKeys: string[];
  isActive?: boolean;
}

const placeholderImg = ['product-placeholder.svg'];

export const productSeeds: ProductSeed[] = [
  // ── Dresses ────────────────────────────────────────────────────────────────
  {
    name: 'Silk Wrap Midi Dress',
    description:
      'A fluid silk midi cut on the bias, finished with a self-tie waist. Drapes effortlessly from desk to dinner.',
    price: 189.0,
    stockQuantity: 24,
    category: 'Dresses',
    imageKeys: placeholderImg,
  },
  {
    name: 'Pleated Satin Maxi Dress',
    description:
      'A bias-cut satin maxi with knife pleats that catch the light. Sits at the natural waist and skims the floor.',
    price: 168.0,
    stockQuantity: 18,
    category: 'Dresses',
    imageKeys: placeholderImg,
  },
  {
    name: 'Linen Shirt Dress',
    description:
      'A breezy, garment-washed linen shirt dress with a relaxed collar and removable belt. Your warm-weather staple.',
    price: 119.0,
    stockQuantity: 36,
    category: 'Dresses',
    imageKeys: placeholderImg,
  },
  {
    name: 'Floral Tea Dress',
    description:
      'A vintage-inspired tea dress in a soft viscose print. Puff sleeves, smocked back, and a flattering midi length.',
    price: 98.0,
    stockQuantity: 0,
    category: 'Dresses',
    imageKeys: placeholderImg,
  },

  // ── Tops ───────────────────────────────────────────────────────────────────
  {
    name: 'Cashmere Crewneck Sweater',
    description:
      'Grade-A Mongolian cashmere knit to a mid-weight gauge. Warm, weightless, and impossibly soft.',
    price: 165.0,
    stockQuantity: 30,
    category: 'Tops',
    imageKeys: placeholderImg,
  },
  {
    name: 'Linen Button-Down Shirt',
    description:
      'A breezy, garment-washed linen shirt with a relaxed collar. Your warm-weather staple.',
    price: 79.0,
    stockQuantity: 52,
    category: 'Tops',
    imageKeys: placeholderImg,
  },
  {
    name: 'Ribbed Cotton Tank',
    description:
      'A fitted, ribbed organic-cotton tank with a clean scoop neck. Layers under everything; stands alone in summer.',
    price: 38.0,
    stockQuantity: 88,
    category: 'Tops',
    imageKeys: placeholderImg,
  },
  {
    name: 'Silk Camisole Top',
    description:
      'A slip-style camisole in washed silk with adjustable straps and a delicate bias hem. Dress up or down.',
    price: 89.0,
    stockQuantity: 44,
    category: 'Tops',
    imageKeys: placeholderImg,
  },

  // ── Blazer ─────────────────────────────────────────────────────────────────
  {
    name: 'Oversized Wool Blazer',
    description:
      'A relaxed, double-breasted blazer in Italian wool. Structured shoulders, soft lapel, endlessly layerable.',
    price: 245.0,
    stockQuantity: 16,
    category: 'Blazer',
    imageKeys: placeholderImg,
  },
  {
    name: 'Tailored Linen Blazer',
    description:
      'A single-breasted linen blazer with a half-canvas front and patch pockets. Crisp tailoring, summer-light.',
    price: 198.0,
    stockQuantity: 22,
    category: 'Blazer',
    imageKeys: placeholderImg,
  },
  {
    name: 'Cropped Tweed Blazer',
    description:
      'A boxy, cropped tweed blazer with frayed trims and gilt buttons. A polished finish over denim or tailoring.',
    price: 215.0,
    stockQuantity: 0,
    category: 'Blazer',
    imageKeys: placeholderImg,
  },
  {
    name: 'Double-Breasted Pinstripe Blazer',
    description:
      'A sharp, double-breasted pinstripe blazer cut from a recycled wool blend. Peak lapels and a nipped waist.',
    price: 229.0,
    stockQuantity: 14,
    category: 'Blazer',
    imageKeys: placeholderImg,
  },
];
