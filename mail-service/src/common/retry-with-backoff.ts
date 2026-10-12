export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  onRetry?: () => void | Promise<void>;
}

// Bounded in-place retry for a Kafka @EventPattern handler. The topics this
// runs against have a single partition, so a slow/looping retry here delays
// every message behind it in the same consumer group — keep `attempts` and
// `baseDelayMs` small rather than reaching for unbounded retry or a queue.
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500, onRetry }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await onRetry?.();
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)),
        );
      }
    }
  }
  throw lastError;
}
