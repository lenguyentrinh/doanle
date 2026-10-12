import type { ClientSession, Connection } from 'mongoose';

/**
 * Runs `fn` inside a MongoDB multi-document transaction (requires a replica
 * set). Transient errors (write conflicts) are retried by the driver, so `fn`
 * must be safe to re-run — keep side effects outside it.
 */
export async function runInTransaction<T>(
  connection: Connection,
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  return connection.transaction((session) => fn(session));
}

/** True for a MongoDB duplicate-key (E11000) error. */
export function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}
