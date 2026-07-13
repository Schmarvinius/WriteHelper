import { loadConfig, saveConfig, DEFAULT_MODEL } from '../config.js';
import { listModels } from '../core.js';
import { updateModelsCache } from './completion.js';

/**
 * Register model management commands on the program.
 */
export function registerModelCommands(program) {
  const model = program
    .command('model')
    .description('Manage the default model');

  model
    .command('list')
    .description('List available models from the LLM proxy')
    .action(async () => {
      try {
        const models = await listModels();
        if (models.length === 0) {
          console.log('No models available.');
        } else {
          // Cache models for shell completion
          updateModelsCache(models);
          console.log('Available models:\n');
          for (const id of models) {
            console.log(`  ${id}`);
          }
        }
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });

  model
    .command('get')
    .description('Show the current default model')
    .action(() => {
      const config = loadConfig();
      if (config?.model) {
        console.log(`${config.model}  (from config)`);
      } else {
        console.log(`${DEFAULT_MODEL}  (built-in default)`);
      }
    });

  model
    .command('set')
    .description('Set the default model')
    .argument('<name>', 'model name (e.g. gpt-4.1, anthropic--claude-sonnet-latest)')
    .action((name) => {
      const existing = loadConfig() || {};
      saveConfig({ ...existing, model: name });
      console.log(`Default model set to: ${name}`);
    });
}
