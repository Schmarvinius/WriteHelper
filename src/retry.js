/**
 * Retry wrapper with exponential backoff for transient API failures.
 *
 * Retries on:
 * - Network errors (fetch throws)
 * - HTTP 429 (rate limited)
 * - HTTP 5xx (server errors)
 *
 * Does NOT retry on:
 * - HTTP 4xx (client errors, except 429)
 * - Malformed responses
 *
 * @param {Function} fn - Async function to execute
 * @param {object} opts
 * @param {number} [opts.retries=3] - Maximum number of retries (0 = no retry)
 * @returns {Promise<*>} Result of fn()
 */
export async function withRetry(fn, { retries = 3 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Don't retry if we've exhausted attempts
      if (attempt >= retries) break;

      // Don't retry client errors (4xx) except 429
      if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) {
        break;
      }

      // Calculate delay
      const delay = getDelay(err, attempt);

      // Log retry to stderr
      console.error(`Retrying (attempt ${attempt + 1}/${retries})...`);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Calculate the delay before the next retry.
 * Honors Retry-After header if present, otherwise uses exponential backoff.
 */
function getDelay(err, attempt) {
  // Honor Retry-After if present (from 429 responses)
  if (err.retryAfter) {
    const seconds = parseInt(err.retryAfter, 10);
    if (!isNaN(seconds)) return seconds * 1000;
  }

  // Exponential backoff: 1s, 2s, 4s, 8s, ...
  return Math.pow(2, attempt) * 1000;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
