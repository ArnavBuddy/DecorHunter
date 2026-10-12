// Exponential backoff retry wrapper for all external API calls

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, maxDelayMs = 10000 } = options;

  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) break;

      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.random() * delay * 0.2;
      console.warn(
        `[retry] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${Math.round(delay + jitter)}ms...`,
        err instanceof Error ? err.message : String(err)
      );
      await sleep(delay + jitter);
    }
  }

  throw lastError;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
