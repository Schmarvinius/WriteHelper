import { resolvePrompt } from '../prompts.js';
import { loadConfig } from '../config.js';
import { run } from '../core.js';

/**
 * Register text commands (improve, translate, extend, continue) on the program.
 */
export function registerTextCommands(program) {
  program
    .command('improve')
    .description('Improve, correct, and rewrite text while preserving tone')
    .argument('<text>', 'text to improve')
    .option('-m, --model <name>', 'model to use')
    .option('-s, --system-prompt <prompt>', 'override the system prompt')
    .action(async (text, opts) => {
      try {
        const systemPrompt = resolvePrompt('improve', opts.systemPrompt);
        const result = await run(systemPrompt, text, opts.model);
        console.log(result);
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });

  program
    .command('translate')
    .description('Translate text to a target language')
    .argument('<text>', 'text to translate')
    .requiredOption('-l, --lang <code>', 'target language (e.g. de, fr, es)')
    .option('-m, --model <name>', 'model to use')
    .option('-s, --system-prompt <prompt>', 'override the system prompt')
    .action(async (text, opts) => {
      try {
        let systemPrompt;
        if (opts.systemPrompt) {
          systemPrompt = opts.systemPrompt;
        } else {
          const config = loadConfig();
          if (config?.prompts?.translate) {
            systemPrompt = config.prompts.translate.replace('the target language', opts.lang);
          } else {
            systemPrompt =
              `You are a professional translator. Translate the given text to ${opts.lang}.\n\n` +
              'Rules:\n' +
              '- Produce a natural, fluent translation, not a word-for-word literal one\n' +
              '- Preserve the original tone and register\n' +
              '- Never use em dashes. Use commas, semicolons, periods, or parentheses instead\n' +
              '- Output ONLY the translated text, nothing else. No explanations, no quotes, no prefixes';
          }
        }
        const result = await run(systemPrompt, text, opts.model);
        console.log(result);
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });

  program
    .command('extend')
    .description('Elaborate and expand text to make it longer and more detailed')
    .argument('<text>', 'text to extend')
    .option('-m, --model <name>', 'model to use')
    .option('-s, --system-prompt <prompt>', 'override the system prompt')
    .action(async (text, opts) => {
      try {
        const systemPrompt = resolvePrompt('extend', opts.systemPrompt);
        const result = await run(systemPrompt, text, opts.model);
        console.log(result);
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });

  program
    .command('continue')
    .description('Continue writing from where the text left off')
    .argument('<text>', 'text to continue from')
    .option('-m, --model <name>', 'model to use')
    .option('-s, --system-prompt <prompt>', 'override the system prompt')
    .action(async (text, opts) => {
      try {
        const systemPrompt = resolvePrompt('continue', opts.systemPrompt);
        const result = await run(systemPrompt, text, opts.model);
        console.log(result);
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });
}
