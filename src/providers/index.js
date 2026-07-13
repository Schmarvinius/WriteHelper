import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROVIDERS_DIR } from '../config.js';
import openai from './openai.js';

const registry = new Map();

// Register built-in providers
registry.set(openai.name, openai);

/**
 * Load user-supplied providers from ~/.wh/providers/*.js
 * Malformed plugins log a warning and are skipped.
 */
export async function loadUserProviders() {
  if (!existsSync(PROVIDERS_DIR)) return;

  const files = readdirSync(PROVIDERS_DIR).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const filePath = join(PROVIDERS_DIR, file);
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const mod = await import(fileUrl);
      const provider = mod.default;

      if (!provider?.name || typeof provider.chat !== 'function') {
        console.error(`[wh] Warning: skipping invalid provider plugin "${file}" (must export { name, chat })`);
        continue;
      }

      if (registry.has(provider.name)) {
        console.error(`[wh] Warning: provider "${provider.name}" from "${file}" overrides built-in provider`);
      }

      registry.set(provider.name, provider);
    } catch (err) {
      console.error(`[wh] Warning: failed to load provider plugin "${file}": ${err.message}`);
    }
  }
}

/**
 * Get a provider by name. Throws if not found.
 */
export function getProvider(name) {
  const provider = registry.get(name);
  if (!provider) {
    const available = [...registry.keys()].join(', ');
    throw new Error(`Unknown provider: "${name}". Available providers: ${available}`);
  }
  return provider;
}

/**
 * List all registered provider names.
 */
export function listProviders() {
  return [...registry.keys()];
}
