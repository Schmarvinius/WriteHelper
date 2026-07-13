import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const MODELS_CACHE_FILE = join(homedir(), '.wh', 'models-cache.json');
const CACHE_TTL_MS = 3600000; // 1 hour

const COMMANDS = ['improve', 'translate', 'extend', 'continue', 'config', 'model', 'prompt', 'commit', 'completion', 'history'];
const TEXT_COMMANDS = ['improve', 'translate', 'extend', 'continue'];
const MODEL_SUBCOMMANDS = ['list', 'get', 'set'];
const PROMPT_SUBCOMMANDS = ['show', 'set', 'reset'];

/**
 * Register the completion command on the program.
 */
export function registerCompletionCommand(program) {
  program
    .command('completion')
    .description('Generate shell completion scripts')
    .argument('<shell>', 'shell type (bash, zsh, fish)')
    .action((shell) => {
      const generators = { bash: generateBash, zsh: generateZsh, fish: generateFish };
      const gen = generators[shell];
      if (!gen) {
        console.error(`Unsupported shell: "${shell}". Supported: bash, zsh, fish`);
        process.exit(1);
      }
      console.log(gen());
    });

  program
    .command('completion:install', { hidden: true })
    .description('Auto-detect shell and install completions')
    .action(() => {
      const shell = detectShell();
      if (!shell) {
        console.error('Could not detect shell. Use "wh completion <bash|zsh|fish>" manually.');
        process.exit(1);
      }
      installCompletion(shell);
    });
}

function detectShell() {
  const shellEnv = process.env.SHELL || '';
  if (shellEnv.includes('zsh')) return 'zsh';
  if (shellEnv.includes('bash')) return 'bash';
  if (shellEnv.includes('fish')) return 'fish';
  return null;
}

function installCompletion(shell) {
  const script = { bash: generateBash, zsh: generateZsh, fish: generateFish }[shell]();
  let targetPath;

  switch (shell) {
    case 'bash': {
      const dir = '/usr/local/etc/bash_completion.d';
      if (existsSync(dir)) {
        targetPath = join(dir, 'wh');
      } else {
        targetPath = join(homedir(), '.bash_completion.d', 'wh');
        mkdirSync(join(homedir(), '.bash_completion.d'), { recursive: true });
      }
      break;
    }
    case 'zsh': {
      const dir = join(homedir(), '.zsh', 'completions');
      mkdirSync(dir, { recursive: true });
      targetPath = join(dir, '_wh');
      break;
    }
    case 'fish': {
      const dir = join(homedir(), '.config', 'fish', 'completions');
      mkdirSync(dir, { recursive: true });
      targetPath = join(dir, 'wh.fish');
      break;
    }
  }

  writeFileSync(targetPath, script);
  console.log(`Completion script installed to: ${targetPath}`);

  if (shell === 'zsh') {
    console.log('\nMake sure your .zshrc contains:\n  fpath=(~/.zsh/completions $fpath)\n  autoload -Uz compinit && compinit');
  } else if (shell === 'bash') {
    console.log(`\nMake sure your .bashrc sources the completion:\n  source ${targetPath}`);
  }
}

/**
 * Get cached model list for dynamic completion.
 * Returns cached models or empty array if cache is stale/missing.
 */
function getCachedModels() {
  try {
    if (!existsSync(MODELS_CACHE_FILE)) return [];
    const cache = JSON.parse(readFileSync(MODELS_CACHE_FILE, 'utf-8'));
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) return [];
    return cache.models || [];
  } catch {
    return [];
  }
}

/**
 * Update the models cache (called by wh model list).
 */
export function updateModelsCache(models) {
  try {
    mkdirSync(join(homedir(), '.wh'), { recursive: true });
    writeFileSync(MODELS_CACHE_FILE, JSON.stringify({ timestamp: Date.now(), models }, null, 2));
  } catch {
    // Silently ignore cache write failures
  }
}

// --- Bash completion ---

function generateBash() {
  return `# wh bash completion
# Install: wh completion bash > /usr/local/etc/bash_completion.d/wh
#   or: wh completion bash >> ~/.bashrc

_wh_completions() {
  local cur prev commands text_commands model_subcmds prompt_subcmds
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="${COMMANDS.join(' ')}"
  text_commands="${TEXT_COMMANDS.join(' ')}"
  model_subcmds="${MODEL_SUBCOMMANDS.join(' ')}"
  prompt_subcmds="${PROMPT_SUBCOMMANDS.join(' ')}"

  # Top-level commands
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
    return 0
  fi

  local cmd="\${COMP_WORDS[1]}"

  # Subcommands
  case "\${cmd}" in
    model)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "\${model_subcmds}" -- "\${cur}") )
      elif [[ \${COMP_CWORD} -eq 3 && "\${prev}" == "set" ]]; then
        local models
        models=$(wh model list 2>/dev/null | grep '^ ' | sed 's/^  //')
        COMPREPLY=( $(compgen -W "\${models}" -- "\${cur}") )
      fi
      return 0
      ;;
    prompt)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "\${prompt_subcmds}" -- "\${cur}") )
      elif [[ \${COMP_CWORD} -eq 3 ]]; then
        COMPREPLY=( $(compgen -W "${TEXT_COMMANDS.join(' ')} commit" -- "\${cur}") )
      fi
      return 0
      ;;
    completion)
      if [[ \${COMP_CWORD} -eq 2 ]]; then
        COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      fi
      return 0
      ;;
  esac

  # Options for text commands
  case "\${cmd}" in
    ${TEXT_COMMANDS.join('|')})
      case "\${prev}" in
        -m|--model)
          local models
          models=$(wh model list 2>/dev/null | grep '^ ' | sed 's/^  //')
          COMPREPLY=( $(compgen -W "\${models}" -- "\${cur}") )
          return 0
          ;;
        -f|--file|-o|--output)
          COMPREPLY=( $(compgen -f -- "\${cur}") )
          return 0
          ;;
        -l|--lang)
          COMPREPLY=( $(compgen -W "de fr es it pt ja zh ko ru ar nl sv" -- "\${cur}") )
          return 0
          ;;
      esac
      if [[ "\${cur}" == -* ]]; then
        local opts="-m --model -s --system-prompt -f --file -o --output -c --clipboard --context -q --quiet"
        [[ "\${cmd}" == "translate" ]] && opts="\${opts} -l --lang"
        COMPREPLY=( $(compgen -W "\${opts}" -- "\${cur}") )
      fi
      return 0
      ;;
    commit)
      if [[ "\${cur}" == -* ]]; then
        COMPREPLY=( $(compgen -W "-m --model -s --system-prompt -a --apply --conventional" -- "\${cur}") )
      fi
      return 0
      ;;
  esac
}

complete -F _wh_completions wh
`;
}

// --- Zsh completion ---

function generateZsh() {
  return `#compdef wh
# wh zsh completion
# Install: wh completion zsh > ~/.zsh/completions/_wh
# Then add to .zshrc: fpath=(~/.zsh/completions $fpath) && autoload -Uz compinit && compinit

_wh_models() {
  local models
  models=(\${(f)"$(wh model list 2>/dev/null | grep '^ ' | sed 's/^  //')"})
  compadd -a models
}

_wh() {
  local -a commands
  commands=(
    'improve:Fix grammar, spelling, and clarity'
    'translate:Translate text to a target language'
    'extend:Elaborate and expand text'
    'continue:Continue writing from where text left off'
    'commit:Generate a git commit message'
    'config:Configure LLM proxy connection'
    'model:Manage the default model'
    'prompt:Manage custom system prompts'
    'completion:Generate shell completion scripts'
    'history:View past invocations and results'
  )

  if (( CURRENT == 2 )); then
    _describe 'command' commands
    return
  fi

  case "\${words[2]}" in
    improve|extend|continue)
      _arguments \\
        '-m[Model to use]:model:_wh_models' \\
        '--model[Model to use]:model:_wh_models' \\
        '-s[Override system prompt]:prompt:' \\
        '--system-prompt[Override system prompt]:prompt:' \\
        '-f[Read input from file]:file:_files' \\
        '--file[Read input from file]:file:_files' \\
        '-o[Write result to file]:file:_files' \\
        '--output[Write result to file]:file:_files' \\
        '-c[Read/write clipboard]' \\
        '--clipboard[Read/write clipboard]' \\
        '--context[Additional context]:context:' \\
        '-q[Suppress stdout]' \\
        '--quiet[Suppress stdout]' \\
        '*:text:'
      ;;
    translate)
      _arguments \\
        '-m[Model to use]:model:_wh_models' \\
        '--model[Model to use]:model:_wh_models' \\
        '-s[Override system prompt]:prompt:' \\
        '--system-prompt[Override system prompt]:prompt:' \\
        '-l[Target language]:language:(de fr es it pt ja zh ko ru ar nl sv)' \\
        '--lang[Target language]:language:(de fr es it pt ja zh ko ru ar nl sv)' \\
        '-f[Read input from file]:file:_files' \\
        '--file[Read input from file]:file:_files' \\
        '-o[Write result to file]:file:_files' \\
        '--output[Write result to file]:file:_files' \\
        '-c[Read/write clipboard]' \\
        '--clipboard[Read/write clipboard]' \\
        '--context[Additional context]:context:' \\
        '-q[Suppress stdout]' \\
        '--quiet[Suppress stdout]' \\
        '*:text:'
      ;;
    commit)
      _arguments \\
        '-m[Model to use]:model:_wh_models' \\
        '--model[Model to use]:model:_wh_models' \\
        '-s[Override system prompt]:prompt:' \\
        '--system-prompt[Override system prompt]:prompt:' \\
        '-a[Create the commit]' \\
        '--apply[Create the commit]' \\
        '--conventional[Use conventional commits format]'
      ;;
    model)
      if (( CURRENT == 3 )); then
        local -a subcmds
        subcmds=('list:List available models' 'get:Show current model' 'set:Set default model')
        _describe 'subcommand' subcmds
      elif (( CURRENT == 4 )) && [[ "\${words[3]}" == "set" ]]; then
        _wh_models
      fi
      ;;
    prompt)
      if (( CURRENT == 3 )); then
        local -a subcmds
        subcmds=('show:Show active prompt' 'set:Set custom prompt' 'reset:Reset to default')
        _describe 'subcommand' subcmds
      elif (( CURRENT == 4 )); then
        local -a cmds
        cmds=(improve translate extend continue commit)
        compadd -a cmds
      fi
      ;;
    completion)
      if (( CURRENT == 3 )); then
        compadd bash zsh fish
      fi
      ;;
    config)
      _arguments \\
        '-e[Import from environment variables]' \\
        '--env[Import from environment variables]' \\
        '-p[Provider to configure]:provider:'
      ;;
  esac
}

_wh "\$@"
`;
}

// --- Fish completion ---

function generateFish() {
  return `# wh fish completion
# Install: wh completion fish > ~/.config/fish/completions/wh.fish

# Disable file completions by default
complete -c wh -f

# Helper: get models
function __wh_models
  wh model list 2>/dev/null | string match -r '^ .*' | string trim
end

# Top-level commands
complete -c wh -n "__fish_use_subcommand" -a "improve" -d "Fix grammar, spelling, and clarity"
complete -c wh -n "__fish_use_subcommand" -a "translate" -d "Translate text to a target language"
complete -c wh -n "__fish_use_subcommand" -a "extend" -d "Elaborate and expand text"
complete -c wh -n "__fish_use_subcommand" -a "continue" -d "Continue writing from where text left off"
complete -c wh -n "__fish_use_subcommand" -a "commit" -d "Generate a git commit message"
complete -c wh -n "__fish_use_subcommand" -a "config" -d "Configure LLM proxy connection"
complete -c wh -n "__fish_use_subcommand" -a "model" -d "Manage the default model"
complete -c wh -n "__fish_use_subcommand" -a "prompt" -d "Manage custom system prompts"
complete -c wh -n "__fish_use_subcommand" -a "completion" -d "Generate shell completion scripts"
complete -c wh -n "__fish_use_subcommand" -a "history" -d "View past invocations"

# Text command options
for cmd in improve translate extend continue
  complete -c wh -n "__fish_seen_subcommand_from $cmd" -s m -l model -d "Model to use" -xa "(__wh_models)"
  complete -c wh -n "__fish_seen_subcommand_from $cmd" -s s -l system-prompt -d "Override system prompt"
  complete -c wh -n "__fish_seen_subcommand_from $cmd" -s f -l file -d "Read input from file" -rF
  complete -c wh -n "__fish_seen_subcommand_from $cmd" -s o -l output -d "Write result to file" -rF
  complete -c wh -n "__fish_seen_subcommand_from $cmd" -s c -l clipboard -d "Read/write clipboard"
  complete -c wh -n "__fish_seen_subcommand_from $cmd" -l context -d "Additional context"
  complete -c wh -n "__fish_seen_subcommand_from $cmd" -s q -l quiet -d "Suppress stdout"
end

# Translate-specific
complete -c wh -n "__fish_seen_subcommand_from translate" -s l -l lang -d "Target language" -xa "de fr es it pt ja zh ko ru ar nl sv"

# Commit options
complete -c wh -n "__fish_seen_subcommand_from commit" -s m -l model -d "Model to use" -xa "(__wh_models)"
complete -c wh -n "__fish_seen_subcommand_from commit" -s s -l system-prompt -d "Override system prompt"
complete -c wh -n "__fish_seen_subcommand_from commit" -s a -l apply -d "Create the commit"
complete -c wh -n "__fish_seen_subcommand_from commit" -l conventional -d "Use conventional commits format"

# Model subcommands
complete -c wh -n "__fish_seen_subcommand_from model; and not __fish_seen_subcommand_from list get set" -a "list" -d "List available models"
complete -c wh -n "__fish_seen_subcommand_from model; and not __fish_seen_subcommand_from list get set" -a "get" -d "Show current model"
complete -c wh -n "__fish_seen_subcommand_from model; and not __fish_seen_subcommand_from list get set" -a "set" -d "Set default model"
complete -c wh -n "__fish_seen_subcommand_from model; and __fish_seen_subcommand_from set" -xa "(__wh_models)"

# Prompt subcommands
complete -c wh -n "__fish_seen_subcommand_from prompt; and not __fish_seen_subcommand_from show set reset" -a "show" -d "Show active prompt"
complete -c wh -n "__fish_seen_subcommand_from prompt; and not __fish_seen_subcommand_from show set reset" -a "set" -d "Set custom prompt"
complete -c wh -n "__fish_seen_subcommand_from prompt; and not __fish_seen_subcommand_from show set reset" -a "reset" -d "Reset to default"

# Completion subcommand
complete -c wh -n "__fish_seen_subcommand_from completion" -a "bash zsh fish" -d "Shell type"

# Config options
complete -c wh -n "__fish_seen_subcommand_from config" -s e -l env -d "Import from environment"
complete -c wh -n "__fish_seen_subcommand_from config" -s p -l provider -d "Provider to configure"
`;
}
