# WriteHelper (wh)

A CLI tool to improve, translate, extend, and continue text using SAP AI Core.

## Prerequisites

- Node.js >= 20
- Access to an SAP AI Core instance with an orchestration deployment

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

Before using the tool, configure your AI Core credentials. Pick one of the following:

### Interactive setup

```bash
wh config
```

You will be prompted for:
- AI Core Service URL
- Client ID
- Client Secret
- Auth URL (token endpoint base)

Credentials are saved to `~/.wh/config.json`.

### Import from environment variable

If you already have `AICORE_SERVICE_KEY` set (the full service key JSON):

```bash
wh config --env
```

### Environment variable only

You can also skip `wh config` entirely and just export the variable:

```bash
export AICORE_SERVICE_KEY='{"clientid":"...","clientsecret":"...","url":"...","serviceurls":{"AI_API_URL":"..."}}'
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
| `config`    | Configure AI Core credentials                    |

### Options

| Option              | Applies to  | Description                          | Default  |
|---------------------|-------------|--------------------------------------|----------|
| `-m, --model <name>`| all commands| Model to use                         | `gpt-4o` |
| `-l, --lang <code>` | `translate` | Target language (e.g. `de`, `fr`)    | required |
| `-e, --env`         | `config`    | Import credentials from env variable |          |

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

# Use a different model
wh improve --model=gpt-4o-mini "some text with erors"

# Pipe output to clipboard (macOS)
wh improve "some text" | pbcopy
```
