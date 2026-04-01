# OpenClaw Fresh Install — Setup Guide

## Overview

Set up OpenClaw as a personal AI assistant on an existing DigitalOcean Ubuntu 24.04 droplet. The server already runs other Docker services (n8n, Directus, Postgres) — these must not be touched.

OpenClaw runs **natively** (not in Docker) to avoid conflicts with existing containers.

---

## Principles

1. **Use the onboarding wizard.** Don't manually craft `openclaw.json`. The wizard exists for a reason.
2. **Don't invent config keys.** Every key must come from the official docs at https://docs.openclaw.ai.
3. **Agent-first.** After initial setup, the agent should handle its own configuration. Only use the terminal for things the agent genuinely cannot do (granting itself permissions, initial installs).
4. **Cost-conscious model routing.** Use cheap models for everyday chat, strong models only when needed.
5. **Don't over-engineer.** Run the wizard, let the agent configure itself through conversation.

---

## What Requires Terminal (Not Agent)

These are the **only** things that must be done from the command line:

- Installing Node.js (before OpenClaw exists)
- Installing OpenClaw itself (before the agent exists)
- Running the onboarding wizard (interactive TUI)
- Granting elevated permissions (`elevatedDefault`) — the agent can't grant itself permissions
- Setting exec host/security config (must be done before agent can run shell commands)
- Setting `OP_SERVICE_ACCOUNT_TOKEN` in `~/.openclaw/.env`
- Installing 1Password CLI (`op`) if not already present

**After Phase 6 (elevated permissions enabled),** the agent can handle system package installs (Chrome, gog), config changes, safeBins, gateway restarts, and skills. Try agent-first, fall back to terminal only if it fails.

---

## Phase 1: Server Prep

### Clean up previous installs

```bash
rm -rf ~/.openclaw
rm -rf ~/.local/bin/openclaw
systemctl --user stop openclaw-gateway.service 2>/dev/null
systemctl --user disable openclaw-gateway.service 2>/dev/null
```

### Install Node.js 24

```bash
node --version  # Check current version — need 22.14+ or 24.x
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
free -h  # Check if swap exists
```

If no swap and RAM is tight:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

If you have 2GB+ free RAM, skip this.

---

## Phase 2: Install OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
openclaw --version
```

**Do NOT run `openclaw onboard` yet.** Continue to the wizard section.

---

## Phase 3: Onboarding Wizard

Run the wizard with the `--install-daemon` flag:

```bash
openclaw onboard --install-daemon
```

### Wizard choices (in order)

| Step | Choice | Notes |
|------|--------|-------|
| Setup mode | **Manual** | Lets you configure everything in one pass |
| Gateway type | **Local gateway** | Running on this machine |
| Workspace directory | **Accept default** (`/root/.openclaw/workspace`) | Don't mix with Docker service directories |
| Model/auth provider | **OpenRouter** | Scroll down to find it |
| Default model | **openrouter/google/gemini-3-flash-preview** | Best cheap daily driver |
| Gateway port | **18789** (default) | |
| Gateway bind | **Loopback (127.0.0.1)** | For SSH tunnel access |
| Gateway auth | **Token** | |
| Tailscale | **Off** | Unless you use Tailscale |
| Gateway token | **Leave blank** (auto-generates) | |
| Configure channels | **Yes** | |
| Telegram | Paste bot token from BotFather | Create a new bot if needed |
| DM access policy | **Allowlist** | Enter your Telegram user ID |
| Web search | **DuckDuckGo** | Free, no key needed |
| Skills | **No** (skip) | Agent installs skills later |
| Hooks | **session-memory** only | Saves context on session reset |
| Install Gateway service | **Yes** | Keeps gateway running after disconnect |
| Gateway runtime | **Node** | Required for Telegram |
| Hatch bot | **Hatch in TUI** | Chat with the bot to set up identity |

### TUI tips

- The TUI input can be tricky. Type your message, then press **Esc** followed by **Enter** to submit.
- Tell the bot who you are, what you do, how you want it to behave, and what services it runs alongside.
- Let the bot create its own workspace files (USER.md, IDENTITY.md). Don't pre-populate them.
- Exit TUI with `Ctrl+C` when done.

---

## Phase 4: VSCode Watcher Exclusions

**Do this BEFORE opening the OpenClaw directory in VSCode remotely.**

In VSCode: `Cmd + Shift + P` → "Preferences: Open User Settings (JSON)" → merge these into your existing settings object:

```json
{
    "files.watcherExclude": {
        "/root/.openclaw/agents/**/sessions/**": true,
        "/root/.openclaw/credentials/**": true
    }
}
```

> **Important:** Don't paste this as a standalone block — merge it into your existing settings JSON. A common mistake is wrapping it in its own `{}` inside the settings file, which breaks JSON syntax.

Without this, VSCode's file watcher can crash the server with runaway `rg` processes.

Then add `/root/.openclaw` as a folder in your workspace via File → Add Folder to Workspace.

---

## Phase 5: Model Strategy

### The problem

OpenRouter's auto-router picks from your configured pool, but cheap models (nano, flash-lite) can't reliably handle multi-step tool calls. Expensive models (Sonnet, Opus) burn through credits fast — a single complex task on Sonnet can cost $1-2.

### The solution

Three tiers: cheap daily driver, cheaper fallback, strong when needed.

**Daily driver:** `openrouter/google/gemini-3-flash-preview` — fast, cheap, handles reasoning and tool calls well.

```bash
openclaw config set agents.defaults.model.primary "openrouter/google/gemini-3-flash-preview"
```

**Model aliases** (so you can switch with `/model <alias>` in chat):

```bash
openclaw config set agents.defaults.models '{"openrouter/google/gemini-3-flash-preview": {"alias": "gemini"}, "openrouter/openai/gpt-5-mini": {"alias": "mini"}, "openrouter/anthropic/claude-sonnet-4-6": {"alias": "sonnet"}}' --strict-json
```

**Usage pattern:**
- Default: gemini handles everyday chat, tool calls, calendar, email, shell commands
- `/model mini` for pure shell/lookup tasks where cost matters most
- `/model sonnet` for complex multi-step tasks, OAuth flows, debugging
- `/model gemini` to switch back when done

### When to escalate

**Gemini is fine for:** calendar, email, shell commands, config changes, file edits, web searches, memory updates, git operations.

**Switch to Sonnet for:** OAuth flows, multi-step debugging, large code generation, complex planning.

### Context cost reduction

Default context is 200k tokens — way too much for routine tasks:

```bash
openclaw config set agents.defaults.contextTokens 40000
openclaw config set agents.defaults.compaction.mode "safeguard"
openclaw config set agents.defaults.compaction.memoryFlush.enabled true
openclaw config set session.reset.mode "daily"
openclaw config set session.reset.idleMinutes 120
```

### Exec host config (required — do this on every install)

OpenClaw defaults exec commands to a sandbox with `security=deny`, which blocks the agent from running any shell commands. This must be set explicitly to route exec to the gateway host:

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

Also set `exec-approvals.json` to match (push to gateway):

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

Grant elevated permissions so the agent can run system commands:

```bash
openclaw config set agents.defaults.elevatedDefault "on"
```

Restart and start a new session:

```bash
openclaw gateway restart
```

Then in Telegram, send `/new` to start a fresh session.

---

## Phase 7: Agent-Driven Setup

From this point, **tell the agent what you want** rather than giving explicit commands. Start a fresh session (`/new`) for each major task.

### Workspace file hygiene

The workspace root should only contain core MD files and skills. Working files (screenshots, HTML dumps, scraped JSON, scripts) must go in `workspace/tmp/`. Add this rule to AGENTS.md:

> "Save all working files (screenshots, HTML dumps, JSONs, scripts) to `workspace/tmp/`. Never save working files to the workspace root."

### Memory structure

OpenClaw uses a three-tier memory system. Make sure the agent understands each tier:

- **USER.md** — Static facts about you. Family, routines, preferences, timezone. Updated when facts change, not daily.
- **MEMORY.md** — Curated long-term insights the agent builds over time. Patterns, deductions, personality inference. Not raw facts — interpretations. Create this file manually at setup if the wizard didn't create it.
- **memory/YYYY-MM-DD.md** — Raw daily logs. What happened today. Session notes only.

Tell the agent:

> "Store permanent facts about me in USER.md. Store insights and patterns you've deduced about me in MEMORY.md. Use daily memory files only for session notes. Never ask where to save — just save it correctly."

### Git backup for workspace

The workspace should already have git initialized from Phase 3. Tell the agent:

> "Connect the workspace git repo to https://github.com/YOUR_USERNAME/YOUR_REPO.git. Get my GitHub PAT from 1Password and set up the remote with the PAT embedded in the URL using the format https://x-access-token:PAT@github.com/USERNAME/REPO.git — then push."

The PAT must be embedded in the remote URL so future pushes require no credential steps. Verify with:

```bash
git -C ~/.openclaw/workspace remote -v
# Should show: https://x-access-token:<PAT>@github.com/...
```

**Do NOT put in git:** `openclaw.json`, credentials, auth profiles, sessions. Only the workspace directory should be in git. Ensure `.gitignore` covers:

```
../openclaw.json
../credentials/
../agents/*/agent/auth-profiles.json
../agents/*/sessions/
*.env
client_secret*.json
*credentials*.json
memory/*oauth*.md
```

> **Warning:** GitHub secret scanning will reject pushes containing OAuth client secrets. If this happens, use `git filter-repo` to remove the file from history, add it to `.gitignore`, and force push. Then rotate the secret in Google Cloud Console.

### 1Password integration

**Install `op` CLI** (terminal — needed before the agent can use it):

Check if already installed: `op --version`

If not installed:

```bash
curl -sS https://downloads.1password.com/linux/keys/1password-archive-keyring.gpg | gpg --dearmor --output /usr/share/keyrings/1password-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/amd64 stable main" > /etc/apt/sources.list.d/1password-cli.list
apt update && apt install -y 1password-cli
```

**Add service account token** (terminal only — bare format, no `export`):

```bash
echo 'OP_SERVICE_ACCOUNT_TOKEN=your-token-here' >> ~/.openclaw/.env
op vault list  # Verify it works
openclaw gateway restart
```

> **Important:** The `.env` file uses bare `KEY=VALUE` format — no `export` prefix. The gateway reads it directly.

**Add non-secret env vars to openclaw.json** (not .env):

For vars like GOG tool settings, use `env.vars` in `openclaw.json` instead of `.env`. This is more reliable as the gateway always loads it:

```json
"env": {
  "vars": {
    "GOG_KEYRING_PASSWORD": "openclaw-gog",
    "GOG_ACCOUNT": "your@gmail.com"
  }
}
```

After setup, tell the agent: "List my 1Password vaults" to verify it has access.

### Browser tool (Chrome headless)

**Option A — Agent-first (recommended):**

Tell the agent:

> "Install Google Chrome on this server, configure the browser tool for headless use, add git/cat/ls to safeBins, and restart the gateway. Then test the browser by opening a webpage."

The agent needs elevated permissions (set in Phase 6) to run `dpkg`. If it says elevation is blocked, restart the gateway and start a new session (`/new`) first.

**Option B — Terminal fallback (if agent fails):**

```bash
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
dpkg -i google-chrome-stable_current_amd64.deb
apt --fix-broken install -y
```

Then tell the agent:

> "Chrome is installed at /usr/bin/google-chrome-stable. Configure the browser tool for headless use with noSandbox. Also add git, cat, and ls to safeBins. Restart the gateway."

### Google services (gog CLI)

gog (gogcli) handles Gmail, Calendar, Drive, Contacts, Sheets, Docs, and more.

**Install gog:**

Tell the agent:

> "Install the gogcli binary so you can access Google services — Gmail, Calendar, Drive, Contacts. Use Homebrew if available, otherwise download the binary from https://github.com/steipete/gogcli/releases."

Terminal fallback:

```bash
brew install gogcli  # If Homebrew/Linuxbrew is available
```

> **Known issue:** Linux release binaries have been unreliable. If direct download fails, install Linuxbrew first then `brew install gogcli`.

**OAuth setup for first account** (use `/model sonnet` — complex multi-step task):

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project
2. Enable required APIs: Gmail, Calendar, Drive, People/Contacts
3. Configure OAuth consent screen — set to External, add your email as a test user
4. Create OAuth Desktop credentials, download `credentials.json`
5. Copy to server: `scp credentials.json root@SERVER_IP:/root/.config/gogcli/credentials.json`
6. Tell the agent: "The credentials.json for gog is at /root/.config/gogcli/credentials.json. Run `gog auth credentials /root/.config/gogcli/credentials.json` then `gog auth add your@email.com --manual` and give me the authorization URL."
7. Open the URL in your browser, authorize, paste the code back to the agent
8. Send `/model gemini` to switch back to the daily driver

**Adding a second Google account (e.g. a Google Workspace account):**

You can add multiple accounts to gog using the same Google Cloud project and credentials.json — no need for a separate Cloud project.

1. **Add the account as a test user** in Google Cloud Console → OAuth consent screen → Test users → add `account@yourdomain.com`
2. **If it's a Google Workspace account**, sign into [admin.google.com](https://admin.google.com) as the Workspace admin and check Security → API Controls to ensure third-party OAuth apps are not blocked
3. Tell the agent: "Add account@yourdomain.com to gog. Run `gog-auth auth add account@yourdomain.com --manual` and give me the authorization URL."
4. Open the URL — make sure your browser is signed into the correct Google account (use a separate Chrome profile or incognito to avoid signing in as the wrong account)
5. Authorize, paste the code back to the agent
6. Update TOOLS.md to list all authorized accounts

Once multiple accounts are set up, the agent can query any of them:
```bash
gog-auth --account account@yourdomain.com gmail ls
gog-auth --account account@yourdomain.com calendar list
```

### PDF reading

Built into OpenClaw — no installation needed. The `pdf` tool is available by default.

### Workspace MD files

After setup, manually review and populate these files rather than leaving them to the agent to generate from scratch. The agent reads them every session — they need to be correct from the start:

- **IDENTITY.md** — agent name, role, autonomy rules, tool list, memory rules
- **SOUL.md** — personality and behaviour guidelines
- **USER.md** — facts about you: family, routines, timezone, preferences
- **MEMORY.md** — create this file manually; agent populates it over time
- **AGENTS.md** — workspace rules, session startup order, memory tiers, heartbeat config
- **TOOLS.md** — exact tool paths, commands, accounts, and how to use each

> **Key lesson:** A thin or empty IDENTITY.md is the most common cause of the agent forgetting its tools, asking for unnecessary approval, and losing context between sessions. Populate it properly before first use.

---

## Phase 8: Verification Checklist

After setup, verify everything works:

| Check | How |
|-------|-----|
| Gateway running | `openclaw gateway status` |
| Telegram responding | Send a message to your bot |
| Exec working | Ask Artie: "Run `ls ~/.openclaw/workspace`" — should respond without asking for approval |
| 1Password accessible | Ask Artie: "List my 1Password vaults" |
| Git syncing | Ask Artie: "Commit and push workspace changes" |
| Browser working | Ask Artie: "Open https://example.com in the browser" |
| Google services | Ask Artie: "List my upcoming calendar events" |
| Model switching | Send `/model sonnet` then `/model gemini` |
| GOG env vars loaded | Run `printenv | grep GOG` — should show both vars |

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

**Do NOT put in git:** `openclaw.json`, credentials, auth profiles, sessions. Only the workspace directory should be in git.

---

## Common Issues

### Agent says "elevated execution blocked"
Run `openclaw config set agents.defaults.elevatedDefault "on"` then restart gateway **and** start a new session (`/new` in Telegram). Both steps are required — the config change doesn't take effect in the current session.

### Agent says "exec denied" / can't run shell commands
This is almost always the exec host config missing. OpenClaw defaults exec to `host=sandbox` with `security=deny`. Even with `elevatedDefault: on` set correctly, exec will be blocked unless the host is explicitly set to gateway. Fix — add to `openclaw.json` inside the `tools` block:
```json
"exec": {
  "host": "gateway",
  "security": "full",
  "ask": "off"
}
```
Then push the exec-approvals config and restart:
```bash
openclaw approvals set --gateway --file ~/.openclaw/exec-approvals.json
openclaw gateway restart
```
Then `/new` in Telegram. See Phase 5 for the full exec config setup.

### After an OpenClaw update, agent loses personality and workspace files move to wrong locations
Updates can restructure the workspace into subdirectories (`core/`, `marcs-life/`) that OpenClaw doesn't recognise — it expects all bootstrap files (IDENTITY.md, SOUL.md, USER.md, MEMORY.md, TOOLS.md, AGENTS.md) at the workspace root. Fix: move all MD files back to the workspace root and delete the subdirectories. Also run `openclaw doctor` to fix any service config drift from the update (particularly the gateway entrypoint mismatch). After recovery, re-apply the exec host config from Phase 5 as updates can reset it.

### Agent keeps forgetting tools and asking for approval
IDENTITY.md is too thin. Rewrite it to explicitly list every tool with exact paths and commands, and add clear autonomy rules stating what requires approval vs what should just be done. See the workspace MD files section above.

### Agent stores personal facts in daily memory instead of USER.md
Tell the agent: "Store permanent personal facts about me and my family in USER.md, not daily memory. Daily memory is for session notes and things that happened today." USER.md is loaded every session; daily memory files are ephemeral context.

### git push requires credentials / agent fetches PAT from 1Password for git
The PAT must be embedded directly in the remote URL. Check with `git -C ~/.openclaw/workspace remote -v`. If it doesn't show `https://x-access-token:<PAT>@github.com/...`, reset the remote:
```bash
git -C ~/.openclaw/workspace remote set-url origin https://x-access-token:YOUR_PAT@github.com/USERNAME/REPO.git
```
Add this to TOOLS.md explicitly: "The PAT is embedded in the remote URL. `git push` requires zero authentication steps — never fetch the PAT from 1Password for git."

### GitHub rejects push due to secret scanning
Remove the file from git history using `git filter-repo`, add to `.gitignore`, force push. Then rotate the exposed secret (e.g. Google OAuth client secret in Cloud Console). See the git section in Phase 7.

### GOG env vars not loading (printenv shows nothing)
Don't rely on `.env` for GOG vars — use `env.vars` in `openclaw.json` instead. See the 1Password section in Phase 7.

### apt lock conflict when agent tries to install packages
Tell the agent: "Approved — kill apt lock and proceed." This is safe on a personal server.

### Agent uses expensive model for simple tasks
Set gemini as default: `openclaw config set agents.defaults.model.primary "openrouter/google/gemini-3-flash-preview"`

### Context too large (high token costs per call)
Reduce context window: `openclaw config set agents.defaults.contextTokens 40000`

### VSCode crashes server
Add watcher exclusions before opening remote folders. See Phase 4. Ensure the exclusions are merged into the existing settings JSON, not wrapped in their own object.

### gog OAuth fails with invalid_client
Rotate the client secret in Google Cloud Console, download fresh `credentials.json`, re-run:
```bash
gog auth credentials /root/.config/gogcli/credentials.json
gog auth add your@email.com --manual
```

### Bot not responding after config change
Restart gateway: `openclaw gateway restart`. Start new session: `/new` in Telegram.

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
printenv | grep GOG              # Verify GOG env vars are loaded
git -C ~/.openclaw/workspace remote -v  # Check git remote URL
```

## Useful Telegram Commands

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
