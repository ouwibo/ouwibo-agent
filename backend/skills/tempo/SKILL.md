# ---
# name: Tempo
# description: External API discovery and payments. Use for HTTP requests, service discovery, paid APIs.
# category: development
# icon: api
# priority: 70
# tools: []
# ---

# Tempo — External API Services

Use this skill when user wants to call APIs, make HTTP requests, discover services, or access external data with automatic payments.

## Activation Triggers

Use Tempo when user mentions:
- "tempo", "use tempo"
- "paid APIs", "service discovery"
- "API endpoints", "call external service"
- Specific services like StableEnrich, StableStudio, StableSocial

## Setup (Run Once)

**Step 1 — Install:**
```bash
mkdir -p "$HOME/.local/bin" && curl -fsSL https://tempo.xyz/install -o /tmp/tempo_install.sh && TEMPO_BIN_DIR="$HOME/.local/bin" bash /tmp/tempo_install.sh
```

**Step 2 — Login:**
```bash
tempo wallet login
```
Requires browser/passkey action. Wait for confirmation before continuing.

**Step 3 — Confirm:**
```bash
tempo wallet -t whoami
```

## Path Configuration

The Tempo CLI path can be customized via environment variable:
- Default: `$HOME/.local/bin/tempo`
- Custom: Set `TEMPO_CLI_PATH` environment variable

If `$HOME` doesn't expand, use absolute path.

## Usage

```bash
# Check wallet
tempo wallet -t whoami

# Discover services
tempo wallet -t services --search <query>

# Service details
tempo wallet -t services <SERVICE_ID>

# Make request
tempo request -t -X POST --json '{"input":"..."}' <SERVICE_URL>/<ENDPOINT_PATH>
```

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Command not found | Not installed | Run install commands above |
| "legacy V1 signature" | Outdated version | Reinstall tempo |
| "access key does not exist" | Not logged in | Run `tempo wallet login` |
| No wallet configured | Not logged in | Run `tempo wallet login` |
| HTTP 422 | Wrong request schema | Check service docs |
| Balance 0 | Needs funding | Run `tempo wallet fund` |

## Best Practices

- Use `--dry-run` before expensive requests
- Check balance after multi-request workflows
- Prefer utility services over conversational LLMs
- Always verify endpoint paths from service metadata
