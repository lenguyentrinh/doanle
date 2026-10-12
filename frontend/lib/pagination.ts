// Shared page size for every paginated list — admin (products, orders,
// categories, discounts) and shopper-facing (/orders) alike — one knob
// instead of each screen picking its own number, so lists feel consistent
// across the whole app. Lives under lib/, not features/admin/, since it's no
// longer admin-only.
export const DEFAULT_PAGE_LIMIT = 9;
