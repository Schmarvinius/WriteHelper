import { createInterface } from 'node:readline/promises';
import { loadConfig, saveConfig, DEFAULT_BASE_URL, CONFIG_FILE } from '../config.js';
import { getProvider } from '../providers/index.js';

/**
 * Register the config command on the program.
 */
export function registerConfigCommand(program) {
  program
    .command('config')
    .description('Configure LLM proxy connection')
    .option('-e, --env', 'import from WH_API_KEY and WH_BASE_URL environment variables')
    .option('-p, --provider <name>', 'provider to configure (default: openai)')
    .action(async (opts) => {
      try {
        const providerName = opts.provider || 'openai';
        let settings;

        if (opts.env) {
          const apiKey = process.env.WH_API_KEY;
          const baseUrl = process.env.WH_BASE_URL || DEFAULT_BASE_URL;
          if (!apiKey) {
            console.error('WH_API_KEY environment variable is not set.');
            process.exit(1);
          }
          settings = { baseUrl, apiKey };
          console.log('Imported credentials from environment variables.');
        } else {
          // Use provider's configSchema if available for prompts
          let provider;
          try {
            provider = getProvider(providerName);
          } catch {
            // Provider not yet registered (user may be setting up a new one)
            provider = null;
          }

          const rl = createInterface({ input: process.stdin, output: process.stdout });

          if (provider?.configSchema) {
            settings = {};
            for (const field of provider.configSchema) {
              const defaultHint = field.default ? ` [${field.default}]` : '';
              const answer = await rl.question(`${field.prompt}${defaultHint}: `);
              settings[field.key] = answer || field.default || '';
            }
            rl.close();
          } else {
            // Fallback: generic baseUrl + apiKey prompt
            const baseUrl = await rl.question(`Base URL [${DEFAULT_BASE_URL}]: `) || DEFAULT_BASE_URL;
            const apiKey = await rl.question('API Key: ');
            rl.close();

            if (!apiKey) {
              console.error('API key is required.');
              process.exit(1);
            }
            settings = { baseUrl, apiKey };
          }
        }

        // Save the provider settings
        const existing = loadConfig() || {};
        const providers = existing.providers || {};
        providers[providerName] = settings;
        saveConfig({ ...existing, provider: providerName, providers });

        console.log(`Configuration saved to ${CONFIG_FILE}`);
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });
}
