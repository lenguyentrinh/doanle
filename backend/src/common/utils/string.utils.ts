/**
 * Escape regular-expression metacharacters so user input is matched
 * literally inside a `new RegExp(...)` built for a MongoDB `$regex` filter.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Transform function for class-transformer: trim strings and convert
 * empty/whitespace-only values to undefined.
 * Use as @Transform(trimToUndefinedTransform) in DTOs.
 */
export const trimToUndefinedTransform = ({
  value,
}: {
  value: unknown;
}): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * URL-safe slug: strips diacritics (so Vietnamese names slugify sensibly),
 * lowercases, collapses non-alphanumeric runs to a single hyphen, and trims
 * leading/trailing hyphens.
 */
export function toSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
