import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import clipboardy from 'clipboardy';

/**
 * Resolve the input text from the various sources.
 * Priority: textArg > --file > --clipboard > stdin (if piped)
 *
 * @param {object} opts
 * @param {string} [opts.textArg] - Text passed as positional argument
 * @param {string} [opts.file] - Path to file to read from
 * @param {boolean} [opts.clipboard] - Read from clipboard
 * @returns {Promise<string>} The resolved input text
 */
export async function resolveInput({ textArg, file, clipboard }) {
  // Conflict check: cannot provide both text argument and --file
  if (textArg && file) {
    throw new Error('Cannot use both a text argument and --file. Choose one.');
  }

  // 1. Positional argument takes priority
  if (textArg) return textArg;

  // 2. File input
  if (file) {
    const filePath = resolve(file);
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    try {
      return readFileSync(filePath, 'utf-8').trim();
    } catch (err) {
      throw new Error(`Cannot read file "${filePath}": ${err.message}`);
    }
  }

  // 3. Clipboard
  if (clipboard) {
    const text = await clipboardy.read();
    if (!text || !text.trim()) {
      throw new Error('Clipboard is empty.');
    }
    return text.trim();
  }

  // 4. stdin (if piped / not a TTY)
  if (!process.stdin.isTTY) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const text = Buffer.concat(chunks).toString('utf-8').trim();
    if (!text) {
      throw new Error(
        'No input received from stdin.\n' +
        'Pipe text to wh or use --file / --clipboard instead.'
      );
    }
    return text;
  }

  // Nothing provided
  throw new Error(
    'No input text provided.\n\n' +
    'Provide text as an argument, via --file, --clipboard, or pipe from stdin.\n' +
    'Examples:\n' +
    '  wh improve "your text here"\n' +
    '  wh improve -f ./draft.md\n' +
    '  wh improve --clipboard\n' +
    '  cat file.txt | wh improve'
  );
}

/**
 * Write the result to the configured outputs.
 *
 * @param {string} result - The text result from the LLM
 * @param {object} opts
 * @param {string} [opts.output] - File path to write result to
 * @param {boolean} [opts.clipboard] - Write result to clipboard
 * @param {boolean} [opts.quiet] - Suppress stdout output
 */
export async function writeOutput(result, { output, clipboard, quiet } = {}) {
  // Write to file if --output specified
  if (output) {
    const filePath = resolve(output);
    const dir = dirname(filePath);
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, result + '\n');
  }

  // Write to clipboard if --clipboard specified
  if (clipboard) {
    await clipboardy.write(result);
  }

  // Print to stdout unless --quiet
  if (!quiet) {
    console.log(result);
  }
}
