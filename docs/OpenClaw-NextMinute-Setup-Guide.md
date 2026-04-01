# OpenClaw NextMinute Instance — Setup Guide

> **Forked from:** OpenClaw-Setup-Guide.md (Artie / personal instance)
> **Purpose:** Dedicated OpenClaw assistant for NextMinute operations on a separate DigitalOcean droplet
> **Key differences from Artie:** Bitwarden (not 1Password), Slack (not Telegram), NextMinute Google account, no personal/family context

---

## Overview

Set up a second OpenClaw instance as a NextMinute-focused AI assistant on a **new** DigitalOcean Ubuntu 24.04 droplet. This instance is completely independent of the Artie (personal) instance.

Unlike Artie's droplet, this one may or may not have existing Docker services. Confirm before starting.

---

## Principles

1. **Use the onboarding wizard.** Don't manually craft `openclaw.json`.
2. **Don't invent config keys.** Every key must come from https://docs.openclaw.ai.
3. **Agent-first.** After initial setup, the agent handles its own configuration.
4. **Cost-conscious model routing.** Same tier strategy as Artie — cheap daily driver, strong only when needed.
5. **Don't over-engineer.** Run the wizard, let the agent configure itself through conversation.

---

## What Requires Terminal (Not Agent)

- Installing Node.js
- Installing OpenClaw itself
- Running the onboarding wizard (interactive TUI)
- Granting elevated permissions (`elevatedDefault`)
- Setting exec host/security config (must be done before agent can run shell commands)
- Setting `BW_SESSION` or Bitwarden secrets in `~/.openclaw/.env`
- Installing Bitwarden CLI (`bw`) if not already present

**After elevated permissions are enabled,** the agent can handle system package installs, config changes, safeBins, gateway restarts, and skills.

---

## Phase 1: Server Prep

### Check existing services

```bash
docker ps  # See what's running — don't touch these
```

### Clean up any previous OpenClaw installs

```bash
rm -rf ~/.openclaw
rm -rf ~/.local/bin/openclaw
systemctl --user stop openclaw-gateway.service 2>/dev/null
systemctl --user disable openclaw-gateway.service 2>/dev/null
```

### Install Node.js 24

```bash
node --version  # Need 22.14+ or 24.x
```

If too old:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install nodejs -y
node --version  # Confirm v24.x.x
```

> **Note:** This does NOT affect Docker containers. They bundle their own Node.

### Add swap (optional, for 1-2GB droplets)

```bash
free -h
```

If no swap and RAM is tight:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## Phase 2: Install OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw --version
```

**Do NOT run `openclaw onboard` yet.**

---

## Phase 3: Onboarding Wizard

```bash
openclaw onboard --install-daemon
```

### Wizard choices — DIFFERENCES FROM ARTIE MARKED WITH ⚡

| Step | Choice | Notes |
|------|--------|-------|
| Setup mode | **Manual** | |
| Gateway type | **Local gateway** | |
| Workspace directory | **Accept default** (`/root/.openclaw/workspace`) | |
| Model/auth provider | **OpenRouter** | |
| Default model | **openrouter/google/gemini-3-flash-preview** | Same as Artie |
| Gateway port | **18789** (default) | |
| Gateway bind | **Loopback (127.0.0.1)** | |
| Gateway auth | **Token** | |
| Tailscale | **Off** | |
| Gateway token | **Leave blank** (auto-generates) | |
| Configure channels | **Yes** | |
| ⚡ Slack | **Yes** — paste Slack bot token | See Slack setup below |
| ⚡ Telegram | **Optional** — add if you want both channels | |
| Web search | **DuckDuckGo** | |
| Skills | **No** (skip) | Agent installs skills later |
| Hooks | **session-memory** only | |
| Install Gateway service | **Yes** | |
| Gateway runtime | **Node** | |
| Hatch bot | **Hatch in TUI** | |

### ⚡ Slack Channel Setup (Pre-Wizard)

Before running the wizard, create the Slack bot:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From Scratch
2. Name it (e.g., "NM Assistant") and select your NextMinute workspace
3. Under **OAuth & Permissions**, add bot token scopes: `chat:write`, `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:history`, `im:read`, `im:write`, `users:read`
4. Install to workspace → copy the **Bot User OAuth Token** (`xoxb-...`)
5. Under **Event Subscriptions**, enable events and subscribe to: `message.channels`, `message.groups`, `message.im`, `app_mention`
6. The wizard will ask for the bot token — paste the `xoxb-...` token
7. After the wizard completes and the gateway is running, set the **Request URL** in Slack to point to your gateway (you'll need the gateway URL/tunnel for this)

### TUI tips (same as Artie)

- Type message, press **Esc** then **Enter** to submit
- Tell the bot: who it is (NextMinute ops assistant), what it does, what services it runs alongside
- Let the bot create its own workspace files
- Exit with `Ctrl+C` when done

---

## Phase 4: VSCode Watcher Exclusions

**Do this BEFORE opening the OpenClaw directory in VSCode remotely.**

Merge into your VSCode user settings JSON:

```json
{
    "files.watcherExclude": {
        "/root/.openclaw/agents/**/sessions/**": true,
        "/root/.openclaw/credentials/**": true
    }
}
```

> Same as Artie — don't wrap in its own `{}`, merge into existing settings.

---

## Phase 5: Model Strategy

Same three-tier approach as Artie:

**Daily driver:** `openrouter/google/gemini-3-flash-preview`

```bash
openclaw config set agents.defaults.model.primary "openrouter/google/gemini-3-flash-preview"
```

**Model aliases:**

```bash
openclaw config set agents.defaults.models '{"openrouter/google/gemini-3-flash-preview": {"alias": "gemini"}, "openrouter/openai/gpt-5-mini": {"alias": "mini"}, "openrouter/anthropic/claude-sonnet-4-6": {"alias": "sonnet"}}' --strict-json
```

**Sub-agent rules (carry over from Artie):**
- Gemini: Shell tasks, file ops, web searches, config changes
- Sonnet: ONLY with explicit one-time permission
- DeepSeek-R1: Complex reasoning/logic
- Mini: Trivial non-reasoning tasks only

**Context cost reduction:**

```bash
openclaw config set agents.defaults.contextTokens 40000
openclaw config set agents.defaults.compaction.mode "safeguard"
openclaw config set agents.defaults.compaction.memoryFlush.enabled true
openclaw config set session.reset.mode "daily"
openclaw config set session.reset.idleMinutes 120
```

### Exec host config (required — do this on every install)

OpenClaw defaults exec commands to a sandbox with `security=deny`, which blocks the agent from running any shell commands. Must be set explicitly:

```bash
openclaw config set tools.exec.host "gateway"
openclaw config set tools.exec.security "full"
openclaw config set tools.exec.ask "off"
```

Or edit `openclaw.json` directly — add inside the `tools` block:

```json
"exec": {
  "host": "gateway",
  "security": "full",
  "ask": "off"
}
```

Also set `exec-approvals.json` and push to gateway:

```bash
cat > ~/.openclaw/exec-approvals.json << 'EOF'
{
  "version": 1,
  "socket": {
    "path": "/root/.openclaw/exec-approvals.sock",
    "token": "auto-generated-keep-existing"
  },
  "defaults": {
    "security": "full",
    "ask": "off",
    "askFallback": "full"
  },
  "agents": {
    "main": {
      "security": "full",
      "ask": "off",
      "askFallback": "full"
    }
  }
}
EOF
openclaw approvals set --gateway --file ~/.openclaw/exec-approvals.json
```

> **Note:** Keep the existing `socket.token` value from your original `exec-approvals.json` — don't replace it with the placeholder above.

---

## Phase 6: Enable Agent Self-Management

```bash
openclaw config set agents.defaults.elevatedDefault "on"
openclaw gateway restart
```

Then in Slack (or Telegram), start a fresh session.

---

## Phase 7: Agent-Driven Setup

Start a fresh session for each major task.

### Workspace file hygiene

Same rule as Artie — working files go in `workspace/tmp/`, not the root.

### Memory structure

Same three-tier system, but scoped to NextMinute — no personal/family content:

- **USER.md** — Static facts about the NextMinute context: key staff, systems, accounts, project details
- **MEMORY.md** — Curated insights the agent builds over time about the business, patterns, preferences
- **memory/YYYY-MM-DD.md** — Raw daily logs

### ⚡ Workspace MD files — NextMinute-scoped content

These files need to be written from scratch for this instance. Use Artie's files as structural templates but replace all content:

**IDENTITY.md** — Example starting point:
```markdown
# Identity
- Name: [Choose a name or keep generic]
- Role: NextMinute operations assistant
- Deployed on: DigitalOcean droplet ([NEW_IP])
- Vibe: Direct, evidence-based. No filler.

# Autonomy Rules
- Same as Artie's (do first, report after, never ask for approval on routine tasks)

# Tools
- Bitwarden: bw CLI, session token in env
- Google services: use gog-auth wrapper. Account: [NEXTMINUTE_GOOGLE_ACCOUNT]
- Git: workspace at ~/.openclaw/workspace, PAT embedded in remote URL
- Shell: elevated access enabled
- Browser: Chrome headless
- Web search: DuckDuckGo
```

**USER.md** — NextMinute context only:
```markdown
# USER.md - NextMinute Operations

## Staff
- Anna-Kate Maguire ("AK") — Sales. annakate.maguire@nextminute.com
- Mat Deitz — Sales. mathew.deitz@nextminute.com
- Ryan Agar — Customer Success. ryan.agar@nextminute.com

## Key Systems
- NextMinute app: https://lemon-rock-0e7879200-uat.eastasia.3.azurestaticapps.net/
- HubSpot (API token in Bitwarden)
- [Add other systems as needed]

## Current Projects
- .NET 4.6 → .NET 8 migration regression testing
- [Add others]

## Communication
- Slack is primary channel
- Timezone: Pacific/Auckland
```

**TOOLS.md** — Same structure as Artie's but with these changes:

| Artie | NextMinute Instance |
|-------|-------------------|
| 1Password (`op`) | Bitwarden (`bw`) |
| `OP_SERVICE_ACCOUNT_TOKEN` | `BW_SESSION` (or Bitwarden Secrets Manager) |
| Telegram send commands | Slack message commands |
| `marcnturner@gmail.com` | NextMinute Google account |
| Signal CLI section | Remove (not needed) |

### Git backup for workspace

```bash
# Tell the agent:
"Connect the workspace git repo to https://github.com/[ORG]/[REPO].git.
Get the GitHub PAT from Bitwarden and set up the remote with the PAT embedded
in the URL using the format https://x-access-token:PAT@github.com/ORG/REPO.git
— then push."
```

Same `.gitignore` patterns as Artie:
```
../openclaw.json
../credentials/
../agents/*/agent/auth-profiles.json
../agents/*/sessions/
*.env
client_secret*.json
*credentials*.json
```

### ⚡ Bitwarden integration (replaces 1Password)

**Install `bw` CLI** (terminal):

```bash
# Check if installed
bw --version

# If not installed:
curl -LO "https://vault.bitwarden.com/download/?app=cli&platform=linux"
# Or via npm:
npm install -g @bitwarden/cli
```

**Option A: API Key auth (recommended for servers)**

```bash
# Add to ~/.openclaw/.env (bare KEY=VALUE format, no export):
echo 'BW_CLIENTID=your-client-id' >> ~/.openclaw/.env
echo 'BW_CLIENTSECRET=your-client-secret' >> ~/.openclaw/.env
```

Then the agent can unlock with:
```bash
bw login --apikey
export BW_SESSION=$(bw unlock --passwordenv BW_PASSWORD --raw)
```

**Option B: Bitwarden Secrets Manager (if using that instead)**

```bash
echo 'BWS_ACCESS_TOKEN=your-access-token' >> ~/.openclaw/.env
```

> **Important:** The `.env` file uses bare `KEY=VALUE` format — no `export` prefix. Same as Artie's 1Password setup.

After setup, tell the agent: "List my Bitwarden items" to verify access.

**Add non-secret env vars to openclaw.json** (same pattern as Artie):

```json
"env": {
  "vars": {
    "GOG_KEYRING_PASSWORD": "openclaw-gog",
    "GOG_ACCOUNT": "nextminute-google@example.com"
  }
}
```

### Browser tool (Chrome headless)

Same as Artie — agent-first approach:

> "Install Google Chrome on this server, configure the browser tool for headless use, add git/cat/ls to safeBins, and restart the gateway. Then test the browser by opening a webpage."

### Google services (gog CLI)

Same installation process as Artie, but with the NextMinute Google account:

1. **New Google Cloud project** for this instance (or reuse one — but separate OAuth credentials)
2. Enable APIs: Gmail, Calendar, Drive, People/Contacts
3. OAuth consent screen → External → add NextMinute account as test user
4. Create OAuth Desktop credentials → download `credentials.json`
5. `scp credentials.json root@[NEW_IP]:/root/.config/gogcli/credentials.json`
6. Tell the agent to run auth flow with the NextMinute account email

### PDF skill (replicate from Artie)

Copy the skill directory from Artie's repo or the zip:

```bash
# On the new server, create the skill directory:
mkdir -p ~/.openclaw/workspace/skills/pdf-creator/assets
mkdir -p ~/.openclaw/workspace/skills/pdf-creator/scripts
```

Then copy these files from Artie's workspace:
- `skills/pdf-creator/SKILL.md`
- `skills/pdf-creator/assets/report-template.html`
- `skills/pdf-creator/scripts/render_pdf.py`

> **Note:** The render script requires `python3` on the server. The agent can install it if needed.

Update the SKILL.md paths if the workspace path differs (it shouldn't if using defaults).

---

## Phase 8: Verification Checklist

| Check | How |
|-------|-----|
| Gateway running | `openclaw gateway status` |
| Slack responding | Send a message to your bot in Slack |
| Telegram responding (if enabled) | Send a message to your bot |
| Exec working | Ask agent: "Run `ls ~/.openclaw/workspace`" — should respond without asking for approval |
| Bitwarden accessible | Ask agent: "List my Bitwarden items" |
| Git syncing | Ask agent: "Commit and push workspace changes" |
| Browser working | Ask agent: "Open https://example.com in the browser" |
| Google services | Ask agent: "List my upcoming calendar events" |
| Model switching | `/model sonnet` then `/model gemini` |
| PDF skill | Ask agent: "Create a test PDF report" |
| GOG env vars loaded | `printenv | grep GOG` |

---

## File Locations

| What | Where |
|------|-------|
| OpenClaw config | `~/.openclaw/openclaw.json` |
| Exec approvals config | `~/.openclaw/exec-approvals.json` |
| Environment vars | `~/.openclaw/.env` |
| Workspace (agent files) | `~/.openclaw/workspace/` |
| Agent working files | `~/.openclaw/workspace/tmp/` |
| Sessions/transcripts | `~/.openclaw/agents/main/sessions/` |
| Credentials | `~/.openclaw/credentials/` |
| Auth profiles | `~/.openclaw/agents/main/agent/auth-profiles.json` |
| gog credentials | `~/.config/gogcli/credentials.json` |

---

## Common Issues

### All issues from Artie's guide apply, plus:

### Agent says "exec denied" / can't run shell commands
Same root cause as Artie — exec defaults to `host=sandbox` with `security=deny`. Fix:
```json
"exec": {
  "host": "gateway",
  "security": "full",
  "ask": "off"
}
```
Add to `openclaw.json` tools block, then:
```bash
openclaw approvals set --gateway --file ~/.openclaw/exec-approvals.json
openclaw gateway restart
```
See Phase 5 for full setup.

### After an OpenClaw update, agent loses personality and workspace files move to wrong locations
Same as Artie — updates can restructure workspace into subdirectories. All bootstrap files must be at the workspace root. Run `openclaw doctor` after any update and re-apply exec host config from Phase 5.

### Bitwarden session expires
The `BW_SESSION` token expires. The agent will need to re-unlock periodically. Consider adding a session refresh to the heartbeat or using Bitwarden Secrets Manager for server-side access instead.

### Slack bot not receiving messages
Check that Event Subscriptions are enabled with the correct Request URL pointing to your gateway. The gateway must be externally accessible for Slack events (unlike Telegram which uses polling).

### Slack vs Telegram: gateway accessibility
Telegram uses polling (bot pulls messages) — works behind firewalls. Slack uses webhooks (Slack pushes events) — gateway needs a public URL or tunnel. Options: Cloudflare Tunnel, ngrok, or open the gateway port with appropriate auth.

### Agent confuses NextMinute context with personal context
IDENTITY.md and USER.md must have zero personal/family content. If the agent starts referencing Marc's personal life, check these files — something leaked from the template.

### Agent says "elevated execution blocked"
Same fix as Artie: `openclaw config set agents.defaults.elevatedDefault "on"`, restart gateway, start new session.

### Agent keeps forgetting tools and asking for approval
Same fix: IDENTITY.md is too thin. Populate it properly with all tool paths and autonomy rules.

---

## Useful Commands

```bash
openclaw gateway status          # Check if running
openclaw gateway restart         # Restart after config changes
openclaw status                  # Full status overview
openclaw doctor                  # Diagnose issues
openclaw doctor --fix            # Auto-fix common issues (e.g. after updates)
openclaw config get <path>       # Read a config value
openclaw config set <path> <val> # Set a config value
openclaw models status           # Check current model + auth
openclaw approvals set --gateway --file ~/.openclaw/exec-approvals.json  # Push approvals config
printenv | grep GOG              # Verify GOG env vars
printenv | grep BW               # Verify Bitwarden env vars
git -C ~/.openclaw/workspace remote -v  # Check git remote URL
```

## Useful Slack/Telegram Commands

```
/new           — Start a fresh session
/model gemini  — Switch to Gemini Flash (daily driver)
/model mini    — Switch to GPT-5 mini (cheapest)
/model sonnet  — Switch to Claude Sonnet (complex tasks)
/elevated full — Skip exec approvals for this session (use if still getting approval prompts)
/compact       — Summarize old context to free up window
/status        — Check session state
/context list  — See what's in the context window
```

---

## What NOT to Copy from Artie

- `marcs-life/` directory — personal/family data
- `marcs-life/USER.md` — Marc's personal facts
- `marcs-life/MEMORY.md` — personal insights and patterns
- `marcs-life/memory/*` — daily personal logs
- `projects/golf-bot/` — personal project
- Signal CLI references in TOOLS.md
- Telegram send commands in TOOLS.md (unless also using Telegram)
- 1Password vault references
- Any hardcoded personal email addresses, phone numbers, or family info

## What TO Copy from Artie (as templates)

- `AGENTS.md` structure (adapt content to NextMinute context)
- `IDENTITY.md` structure (rewrite content)
- `SOUL.md` structure (adjust tone/personality for business context — less personal, still direct)
- `TOOLS.md` structure (swap 1Password→Bitwarden, update accounts)
- `skills/pdf-creator/` directory (copy as-is)
- `skills/gog/SKILL.md` (copy as-is)
- `.gitignore` patterns
- Model strategy and config commands
