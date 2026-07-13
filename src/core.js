import { getConfig } from './config.js';
import { getProvider } from './providers/index.js';

/**
 * Run a text command through the configured provider.
 * This is the central orchestration function that all text commands use.
 *
 * @param {string} systemPrompt - The resolved system prompt
 * @param {string} userText - The user's input text
 * @param {string} [modelOverride] - Optional model override from --model flag
 * @returns {Promise<string>} The provider's response text
 */
export async function run(systemPrompt, userText, modelOverride) {
  const { provider: providerName, settings, model: defaultModel } = getConfig();
  const provider = getProvider(providerName);
  const model = modelOverride || defaultModel;

  return provider.chat({ systemPrompt, userText, model, settings });
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

  return provider.listModels({ settings });
}
