# WriteHelper (wh)

A CLI tool to improve, translate, extend, and continue text using any OpenAI-compatible LLM proxy.

## Prerequisites

- Node.js >= 20
- An OpenAI-compatible LLM endpoint (e.g. hai proxy, Ollama, OpenRouter, LiteLLM)

## Install

```bash
git clone <repo-url> && cd WriteHelper
npm install
npm link
```

This makes the `wh` command available globally.

## Uninstall

```bash
npm unlink -g write-helper
rm -rf ~/.wh
```

## Configuration

Before using the tool, configure your LLM proxy connection.

### Interactive setup

```bash
wh config
```

You will be prompted for:
- **Base URL** — your proxy's chat completions endpoint (default: `http://localhost:6655/litellm/v1`)
- **API Key** — the key for authenticating with the proxy

Credentials are saved to `~/.wh/config.json`.

### Import from environment variables

```bash
export WH_API_KEY="your-api-key"
export WH_BASE_URL="http://localhost:6655/litellm/v1"  # optional, uses default if omitted
wh config --env
```

### Quick start with hai proxy

```bash
# 1. Start the proxy (opens browser for SSO on first run)
hai proxy start

# 2. Configure wh with the API key shown in the hai dashboard
wh config

# 3. Use it
wh improve "your text here"
```

## Usage

```
wh <command> [options] "your text"
```

### Commands

| Command     | Description                                      |
|-------------|--------------------------------------------------|
| `improve`   | Fix grammar, spelling, and clarity (keeps tone)  |
| `translate` | Translate text to a target language               |
| `extend`    | Elaborate and expand text with more detail        |
| `continue`  | Continue writing from where the text left off     |
| `config`    | Configure LLM proxy connection                   |
| `model`     | Manage the default model (`list`, `get`, `set`)  |
| `prompt`    | Manage custom system prompts (`show`, `set`, `reset`) |

### Options

| Option                       | Applies to   | Description                          | Default                          |
|------------------------------|--------------|--------------------------------------|----------------------------------|
| `-m, --model <name>`         | text commands| Model to use                         | `anthropic--claude-sonnet-latest` |
| `-s, --system-prompt <text>` | text commands| One-off system prompt override       |                                  |
| `-l, --lang <code>`          | `translate`  | Target language (e.g. `de`, `fr`)    | required                         |
| `-e, --env`                  | `config`     | Import credentials from env vars     |                                  |

### Examples

```bash
# Improve text
wh improve "i think we should reconsider this descision"

# Translate to German
wh translate --lang=de "Hello, how are you?"

# Extend a short message into a longer one
wh extend "We should migrate to the new API"

# Continue writing from an existing paragraph
wh continue "Dear team, I wanted to follow up on our discussion from last week."

# Use a different model for one request
wh improve --model=gpt-4.1 "some text with erors"

# One-off system prompt override
wh improve --system-prompt "Rewrite as a haiku" "The weather is nice today"

# Pipe output to clipboard (macOS)
wh improve "some text" | pbcopy
```

### Model management

```bash
# List all available models from the proxy
wh model list

# Show current default model
wh model get

# Change the default model
wh model set gpt-5
```

### Prompt customization

```bash
# Show the active prompt for a command
wh prompt show improve

# Set a custom persistent prompt
wh prompt set improve "You are a casual editor. Fix errors but keep slang and abbreviations."

# Reset back to the built-in default
wh prompt reset improve
```

## Available Models

Models depend on your LLM proxy. With the hai proxy, you typically have access to:

- **Anthropic** — `anthropic--claude-4-sonnet`, `anthropic--claude-4.5-sonnet`, `anthropic--claude-4.6-opus`, etc.
- **OpenAI** — `gpt-4.1`, `gpt-5`, `gpt-5.5`, etc.
- **Google** — `gemini-2.5-pro`, `gemini-2.5-flash`, etc.
- **Perplexity** — `sonar`, `sonar-pro`

Run `wh model list` to see what's available on your proxy.

## Config File

Configuration is stored at `~/.wh/config.json`:

```json
{
  "baseUrl": "http://localhost:6655/litellm/v1",
  "apiKey": "your-api-key",
  "model": "anthropic--claude-sonnet-latest",
  "prompts": {
    "improve": "Optional custom prompt..."
  }
}
```

| Field     | Required | Description                                       |
|-----------|----------|---------------------------------------------------|
| `baseUrl` | yes      | OpenAI-compatible chat completions endpoint       |
| `apiKey`  | yes      | Bearer token for the proxy                        |
| `model`   | no       | Default model (falls back to `anthropic--claude-sonnet-latest`) |
| `prompts` | no       | Per-command custom system prompts                 |

## License

MIT
