#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';

const CONFIG_DIR = join(homedir(), '.wh');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DEFAULT_BASE_URL = 'http://localhost:6655/litellm/v1';
const DEFAULT_MODEL = 'anthropic--claude-sonnet-latest';

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return null;
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

function getConfig() {
  const config = loadConfig();
  if (!config) {
    console.error('No configuration found. Run "wh config" first.');
    process.exit(1);
  }
  if (config.serviceKey) {
    console.error('Config format has changed. Please re-run "wh config" to set up hai proxy credentials.');
    process.exit(1);
  }
  if (!config.apiKey) {
    console.error('No API key configured. Run "wh config" first.');
    process.exit(1);
  }
  return {
    baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    apiKey: config.apiKey,
    model: config.model || DEFAULT_MODEL
  };
}

async function run(systemPrompt, userText, model) {
  const { baseUrl, apiKey, model: defaultModel } = getConfig();
  const selectedModel = model || defaultModel;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
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

const program = new Command();

program
  .name('wh')
  .description('CLI tool to improve and translate text using an OpenAI-compatible LLM proxy')
  .version('1.1.0');

program
  .command('improve')
  .description('Improve, correct, and rewrite text while preserving tone')
  .argument('<text>', 'text to improve')
  .option('-m, --model <name>', 'model to use')
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
  .option('-m, --model <name>', 'model to use')
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
  .option('-m, --model <name>', 'model to use')
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
  .option('-m, --model <name>', 'model to use')
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
  .description('Configure LLM proxy connection')
  .option('-e, --env', 'import from WH_API_KEY and WH_BASE_URL environment variables')
  .action(async (opts) => {
    try {
      let baseUrl, apiKey;
      if (opts.env) {
        apiKey = process.env.WH_API_KEY;
        baseUrl = process.env.WH_BASE_URL || DEFAULT_BASE_URL;
        if (!apiKey) {
          console.error('WH_API_KEY environment variable is not set.');
          process.exit(1);
        }
        console.log('Imported credentials from environment variables.');
      } else {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        baseUrl = await rl.question(`Base URL [${DEFAULT_BASE_URL}]: `) || DEFAULT_BASE_URL;
        apiKey = await rl.question('API Key: ');
        rl.close();
        if (!apiKey) {
          console.error('API key is required.');
          process.exit(1);
        }
      }
      const existing = loadConfig() || {};
      saveConfig({ ...existing, baseUrl, apiKey });
      console.log(`Configuration saved to ${CONFIG_FILE}`);
    } catch (err) {
      console.error('Error:', err.message);
      process.exit(1);
    }
  });

program.parse();
