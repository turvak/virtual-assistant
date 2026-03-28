# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## Google Suite CLI (gog)

- Binary: `/usr/local/bin/gog` (v0.12.0)
- Wrapper: `/usr/local/bin/gog-auth` (sets required env vars automatically)
- Account: `marcnturner@gmail.com`
- Credentials: `/root/.config/gogcli/credentials.json` (pulled from 1Password vault "Open Claw VA")
- Keyring password env var: `GOG_KEYRING_PASSWORD=openclaw-gog`
- Account env var: `GOG_ACCOUNT=marcnturner@gmail.com`
- Always use `gog-auth` wrapper or set those two env vars before calling `gog`
- OAuth client in 1Password: `VA marcnturner@gmail.com GOG CLI` (item `rj37htequlhduzjtybe6sfbihm`)

### Common commands
- `gog-auth gmail ls` — inbox
- `gog-auth calendar list` — upcoming events
- `gog-auth drive ls` — Drive files
- `gog-auth whoami` — confirm identity

## 1Password CLI (op)

- Version: 2.33.1
- Auth: service account (env var `OP_SERVICE_ACCOUNT_TOKEN`)
- Vault: `Open Claw VA` (`vxaknhjqx6hffxecrwhpglpcyq`)

## DigitalOcean droplet

- Also hosts: n8n, Directus
- OS: Linux 6.8.0-106-generic (x64)
