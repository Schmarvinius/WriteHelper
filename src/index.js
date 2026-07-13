#!/usr/bin/env node

import { Command } from 'commander';
import { loadUserProviders } from './providers/index.js';
import { registerTextCommands } from './commands/text.js';
import { registerConfigCommand } from './commands/config.js';
import { registerModelCommands } from './commands/model.js';
import { registerPromptCommands } from './commands/prompt.js';
import { registerCommitCommand } from './commands/commit.js';
import { registerCompletionCommand } from './commands/completion.js';

// Load user-supplied providers from ~/.wh/providers/
await loadUserProviders();

const program = new Command();

program
  .name('wh')
  .description('CLI tool to improve and translate text using an OpenAI-compatible LLM proxy')
  .version('1.1.0');

// Register all command groups
registerTextCommands(program);
registerCommitCommand(program);
registerConfigCommand(program);
registerModelCommands(program);
registerPromptCommands(program);
registerCompletionCommand(program);

program.parse();
