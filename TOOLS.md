# TOOLS.md - Your Tools

You have all of these. Use them directly. Never ask Marc if you have access.

## Google Suite CLI (gog)

- Binary: `/usr/local/bin/gog` (v0.12.0)
- Wrapper: `/usr/local/bin/gog-auth` (sets required env vars automatically — always use this)
- Account 1: `marcnturner@gmail.com` (Main)
- Account 2: `admin@cpdconsortium.com` (CPD)
- Credentials: `/root/.config/gogcli/credentials.json`
- Env vars set automatically by wrapper: `GOG_KEYRING_PASSWORD`, `GOG_ACCOUNT`

### Usage Instructions
- By default, searches and queries should include results from **both** accounts unless one is specified.
- Use `--account <email>` with `gog-auth` to target a specific account.

### Common commands
- `gog-auth gmail ls` — inbox (defaults to main, search both if requested)
- `gog-auth calendar list` — upcoming events (check both for general requests)
- `gog-auth drive ls` — Drive files
- `gog-auth --account admin@cpdconsortium.com gmail ls` — CPD inbox
- `gog-auth whoami` — confirm identity

### If auth fails
- Re-run: `gog auth credentials /root/.config/gogcli/credentials.json` then `gog auth add marcnturner@gmail.com --manual`
- **Important:** The terminal password must match `GOG_KEYRING_PASSWORD` in `openclaw.json` env.vars (currently `openclaw-gog`). If they don't match, you'll get `aes.KeyUnwrap(): integrity check failed` and the tokens need to be nuked and re-created.
- OAuth client in 1Password: `VA marcnturner@gmail.com GOG CLI` (item `rj37htequlhduzjtybe6sfbihm`)

## 1Password CLI (op)

- Version: 2.33.1
- Auth: service account token already in env as `OP_SERVICE_ACCOUNT_TOKEN`
- Vault: `Open Claw VA` (`vxaknhjqx6hffxecrwhpglpcyq`)
- Just run `op` commands directly — no setup needed each session

## Git

- Workspace: `~/.openclaw/workspace`
- Remote URL format: `https://x-access-token:<PAT>@github.com/turvak/virtual-assistant.git`
- PAT is embedded — `git push` requires zero authentication steps. No 1Password, no token handling. If you think you need to authenticate for git, you are wrong. Just push.

## Shell

- Elevated access enabled (`elevatedDefault: on`)
- Run commands directly without asking permission
- Use `trash` instead of `rm` where possible

## Browser

- Chrome headless at `/usr/bin/google-chrome-stable`
- Configured for headless use with noSandbox

## Web Search

- DuckDuckGo enabled via OpenClaw plugin

## Signal CLI (signal-cli)

- Binary: `/usr/local/bin/signal-cli`
- Version: 0.14.1
- Use for reading/sending Signal messages directly via shell if the Signal channel is not enabled in OpenClaw.
- **List Contacts:** `signal-cli -o json listContacts`
- **Search Contact:** `signal-cli -o json listContacts | jq '.[] | select(.name == "Name")'`
- **Send Message:** `signal-cli send -m "message" +E164number`
- **Known Contacts:**
  - Sarah Turner: `+64212108996`

## Sending Files to Telegram

Use the OpenClaw CLI directly from the server:

```bash
openclaw message send --channel telegram --target <user_id> --message "<caption>" --media "<absolute_path>"
```

- Marc's Telegram user ID: `6316548779`
- `--media` accepts absolute local file paths — no need to serve via URL first
- `--message` is the caption (can be empty string if none needed)

Example:
```bash
openclaw message send --channel telegram --target 6316548779 --message "Here's your report" --media "/root/.openclaw/workspace/reports/my-report.pdf"
```

## Server Context

- DigitalOcean droplet: 143.110.217.97 (Ubuntu 24.04)
- Also hosts: n8n, Directus, Postgres (all in Docker — do not touch)
- OpenClaw runs natively (not in Docker)

---

### Local Notes

Skills define _how_ tools work. This section is for _your_ specifics — the stuff that's unique to your setup.

#### Cameras
- No cameras currently configured.

#### SSH
- No SSH hosts currently configured.

#### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
