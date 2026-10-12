/**
 * Standard paginated response envelope.
 * Used across all list endpoints to provide consistent pagination metadata.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Create a paginated response envelope from query results.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return { data, total, page, limit };
}
