#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';

const CONFIG_DIR = join(homedir(), '.wh');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return null;
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function ensureCredentials() {
  if (process.env.AICORE_SERVICE_KEY) return;
  const config = loadConfig();
  if (!config?.serviceKey) {
    console.error('No AI Core credentials configured. Run "wh config" first or set AICORE_SERVICE_KEY env variable.');
    process.exit(1);
  }
  process.env.AICORE_SERVICE_KEY = JSON.stringify(config.serviceKey);
}

async function importOrchestrationClient() {
  ensureCredentials();
  const { setLogLevel } = await import('@sap-cloud-sdk/util');
  setLogLevel('warn', 'context');
  const { OrchestrationClient } = await import('@sap-ai-sdk/orchestration');
  return OrchestrationClient;
}

const IMPROVE_SYSTEM_PROMPT =
  'You are a professional writing assistant. Your task is to improve, correct, and rewrite the given text.\n\n' +
  'Rules:\n' +
  '- Fix grammar, spelling, and punctuation errors\n' +
  '- Improve clarity and readability\n' +
  '- Do NOT change the tone or voice of the text. If it is casual, keep it casual. If it is formal, keep it formal. Do not make it more formal or casual than it already is\n' +
  '- Never use em dashes. Use commas, semicolons, periods, or parentheses instead\n' +
  '- Do not add new information or change the meaning\n' +
  '- Output ONLY the improved text, nothing else. No explanations, no quotes, no prefixes';

const EXTEND_SYSTEM_PROMPT =
  'You are a professional writing assistant. Your task is to elaborate and expand on the given text, making it longer and more detailed.\n\n' +
  'Rules:\n' +
  '- Keep the same message, meaning, and intent\n' +
  '- Match the original tone and voice exactly. Do NOT change the tone\n' +
  '- Add more detail, examples, or supporting points where appropriate\n' +
  '- Never use em dashes. Use commas, semicolons, periods, or parentheses instead\n' +
  '- Output ONLY the expanded text, nothing else. No explanations, no quotes, no prefixes';

const CONTINUE_SYSTEM_PROMPT =
  'You are a professional writing assistant. Your task is to continue writing from where the given text left off.\n\n' +
  'Rules:\n' +
  '- Continue naturally from the end of the text\n' +
  '- Match the original tone, voice, and style exactly. Do NOT change the tone\n' +
  '- Stay on topic and maintain coherence with the original text\n' +
  '- Never use em dashes. Use commas, semicolons, periods, or parentheses instead\n' +
  '- Output ONLY the continuation (new text), nothing else. No explanations, no quotes, no prefixes';

async function run(systemPrompt, userText, model) {
  const OrchestrationClient = await importOrchestrationClient();
  const client = new OrchestrationClient({
    llm: {
      model_name: model
    }
  });

  const response = await client.chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ]
  });

  return response.getContent();
}

const program = new Command();

program
  .name('wh')
  .description('CLI tool to improve and translate text using SAP AI Core')
  .version('1.0.0');

program
  .command('improve')
  .description('Improve, correct, and rewrite text while preserving tone')
  .argument('<text>', 'text to improve')
  .option('-m, --model <name>', 'model to use', 'gpt-4o')
  .action(async (text, opts) => {
    try {
      const result = await run(IMPROVE_SYSTEM_PROMPT, text, opts.model);
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
  .option('-m, --model <name>', 'model to use', 'gpt-4o')
  .action(async (text, opts) => {
    try {
      const systemPrompt =
        `You are a professional translator. Translate the given text to ${opts.lang}.\n\n` +
        'Rules:\n' +
        '- Produce a natural, fluent translation, not a word-for-word literal one\n' +
        '- Preserve the original tone and register\n' +
        '- Never use em dashes. Use commas, semicolons, periods, or parentheses instead\n' +
        '- Output ONLY the translated text, nothing else. No explanations, no quotes, no prefixes';
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
  .option('-m, --model <name>', 'model to use', 'gpt-4o')
  .action(async (text, opts) => {
    try {
      const result = await run(EXTEND_SYSTEM_PROMPT, text, opts.model);
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
  .option('-m, --model <name>', 'model to use', 'gpt-4o')
  .action(async (text, opts) => {
    try {
      const result = await run(CONTINUE_SYSTEM_PROMPT, text, opts.model);
      console.log(result);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Configure AI Core credentials')
  .option('-e, --env', 'import credentials from AICORE_SERVICE_KEY env variable')
  .action(async (opts) => {
    try {
      let serviceKey;
      if (opts.env) {
        if (!process.env.AICORE_SERVICE_KEY) {
          console.error('AICORE_SERVICE_KEY environment variable is not set.');
          process.exit(1);
        }
        serviceKey = JSON.parse(process.env.AICORE_SERVICE_KEY);
        console.log('Imported credentials from AICORE_SERVICE_KEY.');
      } else {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const url = await rl.question('AI Core Service URL: ');
        const clientid = await rl.question('Client ID: ');
        const clientsecret = await rl.question('Client Secret: ');
        const authUrl = await rl.question('Auth URL (token endpoint base): ');
        rl.close();
        serviceKey = {
          serviceurls: { AI_API_URL: url },
          clientid,
          clientsecret,
          url: authUrl
        };
      }
      saveConfig({ serviceKey });
      console.log(`Credentials saved to ${CONFIG_FILE}`);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

program.parse();
