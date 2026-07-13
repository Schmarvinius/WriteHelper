import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const CONFIG_DIR = join(homedir(), '.wh');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
export const PROVIDERS_DIR = join(CONFIG_DIR, 'providers');
export const DEFAULT_BASE_URL = 'http://localhost:6655/litellm/v1';
export const DEFAULT_MODEL = 'anthropic--claude-sonnet-latest';
export const DEFAULT_PROVIDER = 'openai';

/**
 * Load raw config from disk. Returns null if file doesn't exist.
 */
export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return null;
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
}

/**
 * Save config object to disk.
 */
export function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

/**
 * Migrate old flat config format to namespaced provider format.
 * Old: { baseUrl, apiKey, model, prompts }
 * New: { provider, providers: { openai: { baseUrl, apiKey } }, model, prompts }
 */
function migrateConfig(config) {
  if (!config) return config;

  // Already migrated
  if (config.providers) return config;

  // Old flat format with baseUrl/apiKey at top level
  if (config.baseUrl || config.apiKey) {
    const migrated = {
      provider: DEFAULT_PROVIDER,
      providers: {
        openai: {
          baseUrl: config.baseUrl || DEFAULT_BASE_URL,
          apiKey: config.apiKey
        }
      }
    };
    if (config.model) migrated.model = config.model;
    if (config.prompts) migrated.prompts = config.prompts;
    return migrated;
  }

  return config;
}

/**
 * Get validated config. Exits with helpful error if not configured.
 * Returns: { provider, settings: { baseUrl, apiKey }, model }
 */
export function getConfig() {
  const raw = loadConfig();
  if (!raw) {
    console.error(
      'No configuration found.\n\n' +
      'Run "wh config" to set up your LLM proxy connection.\n' +
      'You will need a base URL and API key from your proxy (e.g. hai proxy).\n\n' +
      'Quick start:\n' +
      '  1. Start your proxy:  hai proxy start\n' +
      '  2. Configure wh:      wh config\n' +
      '  3. Use it:            wh improve "your text here"'
    );
    process.exit(1);
  }
  if (raw.serviceKey) {
    console.error(
      'Config format has changed (old SAP AI Core service key detected).\n\n' +
      'WriteHelper now uses an OpenAI-compatible LLM proxy instead of SAP AI Core directly.\n\n' +
      'To fix this, run:\n\n' +
      '  wh config\n\n' +
      'You will be prompted for:\n' +
      `  - Base URL (default: ${DEFAULT_BASE_URL})\n` +
      '  - API Key (from your LLM proxy, e.g. hai proxy)\n\n' +
      'If you use the hai proxy, start it with "hai proxy start" and use the\n' +
      'API key shown in its dashboard.'
    );
    process.exit(1);
  }

  const config = migrateConfig(raw);
  const providerName = config.provider || DEFAULT_PROVIDER;
  const settings = config.providers?.[providerName] || {};

  if (!settings.apiKey) {
    console.error(
      'No API key configured.\n\n' +
      'Run "wh config" and provide the API key from your LLM proxy.\n' +
      'If using hai proxy, the key is shown in the dashboard when you run "hai proxy start".'
    );
    process.exit(1);
  }

  return {
    provider: providerName,
    settings: {
      baseUrl: settings.baseUrl || DEFAULT_BASE_URL,
      apiKey: settings.apiKey
    },
    model: config.model || DEFAULT_MODEL
  };
}
