import { getHistory, getHistoryEntry, clearHistory } from '../history.js';

const MAX_DISPLAY_LENGTH = 80;

/**
 * Truncate text for display in list view.
 */
function truncate(text, max = MAX_DISPLAY_LENGTH) {
  if (!text) return '';
  const oneLine = text.replace(/\n/g, ' ');
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 3) + '...';
}

/**
 * Register the history command on the program.
 */
export function registerHistoryCommand(program) {
  program
    .command('history')
    .description('View past invocations and results')
    .argument('[id]', 'show full details of a specific entry')
    .option('-n, --limit <n>', 'number of entries to show', '20')
    .option('--clear', 'clear all history')
    .action((id, opts) => {
      try {
        if (opts.clear) {
          clearHistory();
          console.log('History cleared.');
          return;
        }

        if (id) {
          const entry = getHistoryEntry(parseInt(id, 10));
          if (!entry) {
            console.error(`History entry #${id} not found.`);
            process.exit(1);
          }
          console.log(`#${entry.id}  ${entry.timestamp}`);
          console.log(`Command: ${entry.command}`);
          console.log(`Model:   ${entry.model}`);
          console.log(`\n--- Input ---\n${entry.input}`);
          console.log(`\n--- Output ---\n${entry.output}`);
          return;
        }

        const limit = parseInt(opts.limit, 10) || 20;
        const entries = getHistory(limit);

        if (entries.length === 0) {
          console.log('No history yet.');
          return;
        }

        console.log(`Last ${Math.min(limit, entries.length)} entries (newest first):\n`);
        for (const entry of entries) {
          const time = entry.timestamp.replace('T', ' ').replace(/\.\d+Z$/, '');
          console.log(`  #${String(entry.id).padStart(3)}  ${time}  [${entry.command}]  ${truncate(entry.input, 50)}`);
        }
        console.log(`\nUse "wh history <id>" to see full details.`);
      } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
      }
    });
}
