import { loadConfig, saveConfig } from '../config.js';
import { DEFAULT_PROMPTS, VALID_COMMANDS } from '../prompts.js';

/**
 * Register prompt management commands on the program.
 */
export function registerPromptCommands(program) {
  const prompt = program
    .command('prompt')
    .description('Manage custom system prompts for commands');

  prompt
    .command('show')
    .description('Show the active system prompt for a command')
    .argument('<command>', `command name (${VALID_COMMANDS.join(', ')})`)
    .action((cmd) => {
      if (!VALID_COMMANDS.includes(cmd)) {
        console.error(`Unknown command: "${cmd}". Valid commands: ${VALID_COMMANDS.join(', ')}`);
        process.exit(1);
      }
      const config = loadConfig();
      if (config?.prompts?.[cmd]) {
        console.log(`[custom] ${config.prompts[cmd]}`);
      } else {
        console.log(`[default] ${DEFAULT_PROMPTS[cmd]}`);
      }
    });

  prompt
    .command('set')
    .description('Set a custom system prompt for a command')
    .argument('<command>', `command name (${VALID_COMMANDS.join(', ')})`)
    .argument('<prompt>', 'the custom system prompt text')
    .action((cmd, promptText) => {
      if (!VALID_COMMANDS.includes(cmd)) {
        console.error(`Unknown command: "${cmd}". Valid commands: ${VALID_COMMANDS.join(', ')}`);
        process.exit(1);
      }
      const existing = loadConfig() || {};
      const prompts = existing.prompts || {};
      prompts[cmd] = promptText;
      saveConfig({ ...existing, prompts });
      console.log(`Custom prompt saved for: ${cmd}`);
    });

  prompt
    .command('reset')
    .description('Reset a command back to its built-in default prompt')
    .argument('<command>', `command name (${VALID_COMMANDS.join(', ')})`)
    .action((cmd) => {
      if (!VALID_COMMANDS.includes(cmd)) {
        console.error(`Unknown command: "${cmd}". Valid commands: ${VALID_COMMANDS.join(', ')}`);
        process.exit(1);
      }
      const existing = loadConfig() || {};
      if (existing.prompts?.[cmd]) {
        delete existing.prompts[cmd];
        if (Object.keys(existing.prompts).length === 0) delete existing.prompts;
        saveConfig(existing);
        console.log(`Prompt for "${cmd}" reset to default.`);
      } else {
        console.log(`"${cmd}" is already using the default prompt.`);
      }
    });
}
