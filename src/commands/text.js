import { resolvePrompt } from '../prompts.js';
import { loadConfig } from '../config.js';
import { run } from '../core.js';
import { resolveInput, writeOutput } from '../io.js';

/**
 * Shared handler for all text commands.
 * Resolves input from various sources, runs through the provider, and handles output.
 */
async function runTextCommand({ command, textArg, opts, buildSystemPrompt }) {
  try {
    // Resolve input text
    const text = await resolveInput({
      textArg,
      file: opts.file,
      clipboard: opts.clipboard
    });

    // Build system prompt
    let systemPrompt = buildSystemPrompt(text, opts);

    // Append context if provided
    if (opts.context) {
      systemPrompt += `\n\nAdditional context: ${opts.context}`;
    }

    // Run through the LLM
    const result = await run(systemPrompt, text, opts.model);

    // Handle output
    await writeOutput(result, {
      output: opts.output,
      clipboard: opts.clipboard,
      quiet: opts.quiet
    });
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

/**
 * Add the shared options to a command.
 */
function addSharedOptions(cmd) {
  return cmd
    .option('-m, --model <name>', 'model to use')
    .option('-s, --system-prompt <prompt>', 'override the system prompt')
    .option('-f, --file <path>', 'read input text from a file')
    .option('-o, --output <path>', 'write result to a file')
    .option('-c, --clipboard', 'read from and write to clipboard')
    .option('--context <text>', 'additional context for the LLM')
    .option('-q, --quiet', 'suppress stdout output (use with -o or -c)');
}

/**
 * Register text commands (improve, translate, extend, continue) on the program.
 */
export function registerTextCommands(program) {
  addSharedOptions(
    program
      .command('improve')
      .description('Improve, correct, and rewrite text while preserving tone')
      .argument('[text]', 'text to improve')
  ).action(async (text, opts) => {
    await runTextCommand({
      command: 'improve',
      textArg: text,
      opts,
      buildSystemPrompt: () => resolvePrompt('improve', opts.systemPrompt)
    });
  });

  addSharedOptions(
    program
      .command('translate')
      .description('Translate text to a target language')
      .argument('[text]', 'text to translate')
      .requiredOption('-l, --lang <code>', 'target language (e.g. de, fr, es)')
  ).action(async (text, opts) => {
    await runTextCommand({
      command: 'translate',
      textArg: text,
      opts,
      buildSystemPrompt: () => {
        if (opts.systemPrompt) return opts.systemPrompt;
        const config = loadConfig();
        if (config?.prompts?.translate) {
          return config.prompts.translate.replace('the target language', opts.lang);
        }
        return (
          `You are a professional translator. Translate the given text to ${opts.lang}.\n\n` +
          'Rules:\n' +
          '- Produce a natural, fluent translation, not a word-for-word literal one\n' +
          '- Preserve the original tone and register\n' +
          '- Never use em dashes. Use commas, semicolons, periods, or parentheses instead\n' +
          '- Output ONLY the translated text, nothing else. No explanations, no quotes, no prefixes'
        );
      }
    });
  });

  addSharedOptions(
    program
      .command('extend')
      .description('Elaborate and expand text to make it longer and more detailed')
      .argument('[text]', 'text to extend')
  ).action(async (text, opts) => {
    await runTextCommand({
      command: 'extend',
      textArg: text,
      opts,
      buildSystemPrompt: () => resolvePrompt('extend', opts.systemPrompt)
    });
  });

  addSharedOptions(
    program
      .command('continue')
      .description('Continue writing from where the text left off')
      .argument('[text]', 'text to continue from')
  ).action(async (text, opts) => {
    await runTextCommand({
      command: 'continue',
      textArg: text,
      opts,
      buildSystemPrompt: () => resolvePrompt('continue', opts.systemPrompt)
    });
  });
}
