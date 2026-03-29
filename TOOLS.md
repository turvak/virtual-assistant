# TOOLS.md - Your Tools

You have all of these. Use them directly. Never ask Marc if you have access.

## Google Suite CLI (gog)

- Binary: `/usr/local/bin/gog` (v0.12.0)
- Wrapper: `/usr/local/bin/gog-auth` (sets required env vars automatically — always use this)
- Account: `marcnturner@gmail.com`
- Credentials: `/root/.config/gogcli/credentials.json`
- Env vars set automatically by wrapper: `GOG_KEYRING_PASSWORD`, `GOG_ACCOUNT`

### Common commands
- `gog-auth gmail ls` — inbox
- `gog-auth calendar list` — upcoming events
- `gog-auth drive ls` — Drive files
- `gog-auth whoami` — confirm identity

### If auth fails
Re-run: `gog auth credentials /root/.config/gogcli/credentials.json` then `gog auth add marcnturner@gmail.com --manual`
OAuth client in 1Password: `VA marcnturner@gmail.com GOG CLI` (item `rj37htequlhduzjtybe6sfbihm`)

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

## Server Context

- DigitalOcean droplet: 143.110.217.97 (Ubuntu 24.04)
- Also hosts: n8n, Directus, Postgres (all in Docker — do not touch)
- OpenClaw runs natively (not in Docker)
