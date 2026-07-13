import { execSync } from 'node:child_process';
import { resolvePrompt } from '../prompts.js';
import { run } from '../core.js';

const MAX_DIFF_LENGTH = 15000; // truncate very large diffs to stay within token limits

/**
 * Register the commit command on the program.
 */
export function registerCommitCommand(program) {
  program
    .command('commit')
    .description('Generate a git commit message from staged changes')
    .option('-m, --model <name>', 'model to use')
    .option('-s, --system-prompt <prompt>', 'override the system prompt')
    .option('-a, --apply', 'create the commit with the generated message')
    .option('--conventional', 'use conventional commits format (feat/fix/chore/etc.)')
    .action(async (opts) => {
      try {
        // Get staged diff
        let diff;
        try {
          diff = execSync('git diff --staged', { encoding: 'utf-8' });
        } catch (err) {
          throw new Error('Not a git repository or git is not installed.');
        }

        if (!diff.trim()) {
          throw new Error(
            'No staged changes found.\n\n' +
            'Stage your changes first:\n' +
            '  git add <files>\n' +
            '  wh commit'
          );
        }

        // Truncate very large diffs
        let truncated = false;
        if (diff.length > MAX_DIFF_LENGTH) {
          diff = diff.slice(0, MAX_DIFF_LENGTH);
          truncated = true;
        }

        // Also get a summary of staged files for context
        const stagedFiles = execSync('git diff --staged --stat', { encoding: 'utf-8' }).trim();

        // Build the input
        let userText = '';
        if (truncated) {
          userText += '[Note: diff was truncated due to size]\n\n';
        }
        userText += `Files changed:\n${stagedFiles}\n\nDiff:\n${diff}`;

        // Resolve prompt (conventional or plain)
        const promptKey = opts.conventional ? 'commit-conventional' : 'commit';
        const systemPrompt = resolvePrompt(promptKey, opts.systemPrompt);

        // Run through LLM
        const message = await run(systemPrompt, userText, opts.model);

        if (opts.apply) {
          // Create the commit
          execSync(`git commit -m ${JSON.stringify(message)}`, { encoding: 'utf-8', stdio: 'pipe' });
          console.log(`Committed with message:\n\n${message}`);
        } else {
          // Just print the message (pipe-friendly)
          console.log(message);
        }
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });
}
