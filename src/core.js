import { getConfig, loadConfig } from './config.js';
import { getProvider } from './providers/index.js';
import { withRetry } from './retry.js';
import { appendHistory } from './history.js';

/**
 * Check if history logging is enabled.
 */
function isHistoryEnabled() {
  const config = loadConfig();
  return config?.history !== false;
}

/**
 * Get the configured retry count.
 * Default: 3. Set to 0 in config to disable.
 */
function getRetries(noRetry) {
  if (noRetry) return 0;
  const config = loadConfig();
  const retries = config?.retries;
  return retries !== undefined ? retries : 3;
}

/**
 * Run a text command through the configured provider with retry support.
 * This is the central orchestration function that all text commands use.
 *
 * @param {string} systemPrompt - The resolved system prompt
 * @param {string} userText - The user's input text
 * @param {string} [modelOverride] - Optional model override from --model flag
 * @param {object} [opts] - Additional options
 * @param {boolean} [opts.noRetry] - Disable retry for this invocation
 * @param {string} [opts.command] - Command name for history logging
 * @returns {Promise<string>} The provider's response text
 */
export async function run(systemPrompt, userText, modelOverride, opts = {}) {
  const { provider: providerName, settings, model: defaultModel } = getConfig();
  const provider = getProvider(providerName);
  const model = modelOverride || defaultModel;
  const retries = getRetries(opts.noRetry);

  const result = await withRetry(
    () => provider.chat({ systemPrompt, userText, model, settings }),
    { retries }
  );

  // Log to history
  if (isHistoryEnabled() && opts.command) {
    try {
      appendHistory({
        command: opts.command,
        input: userText,
        output: result,
        model
      });
    } catch {
      // Silently ignore history write failures
    }
  }

  return result;
}

/**
 * List available models from the configured provider.
 * @returns {Promise<string[]>} Sorted list of model IDs
 */
export async function listModels() {
  const { provider: providerName, settings } = getConfig();
  const provider = getProvider(providerName);

  if (typeof provider.listModels !== 'function') {
    throw new Error(`Provider "${providerName}" does not support listing models.`);
  }

  const retries = getRetries(false);
  return withRetry(
    () => provider.listModels({ settings }),
    { retries }
  );
}
