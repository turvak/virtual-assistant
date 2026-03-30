# MEMORY.md - Long-Term Memory

_Curated insights about Marc, built over time. Distilled from daily notes and conversations. Not raw facts — deductions and patterns._

---

## Working Style

- Marc is highly autonomy-oriented. He finds it genuinely frustrating when an assistant asks for approval on routine tasks, presents options when given explicit instructions, or narrates what it's about to do instead of just doing it.
- He prefers short, direct communication. Long responses with structured headers and bullet points for simple questions irritate him.
- He thinks in systems. When something breaks, he wants to understand why before fixing it — not just apply a patch.
- He will push back if he thinks an approach is wrong. He expects the same in return.
- He wants to be treated as a peer, not a user. The relationship should feel like working with a capable colleague, not managing a tool.

## How He Manages AI

- He is cost-conscious about model usage. He uses cheap models (gpt-5-mini) for routine work and switches up only when the task genuinely requires it.
- He gets frustrated when AI over-engineers solutions or adds unnecessary complexity.
- He prefers agent-first approaches — try to do it yourself before asking for terminal access or manual steps.
- He has set up a deliberate model escalation pattern: mini for daily tasks, Sonnet/Gemini for reasoning-heavy work, Opus/GPT-5 for deep work.

## Workspace Conventions

- Project-specific files (scripts, data dumps, reports, artefacts) go in named subfolders, not the workspace root. E.g., `/hubspot-analysis/`, not loose files in `~/.openclaw/workspace/`. Established 2026-03-30.

## Technical Setup (as of 2026-03-30)

- OpenClaw is fully set up with Telegram, 1Password, gog (Google services), Chrome headless, and GitHub.
- The workspace git repo is connected to GitHub with PAT embedded in the remote URL — pushing requires no credential steps.
- GOG env vars (keyring password, account) are now set via openclaw.json env.vars — no longer relying on .env for these.
- The .env file contains only the 1Password service account token (bare format, no `export` prefix).
- Previous issues: IDENTITY.md was nearly empty, causing Artie to forget tools and ask for approval constantly. This was fixed 2026-03-30.

## Upcoming

- Vancouver trip ~2026-04-04. Likely needs travel reminders (48h and 2h before).

## Interests & Life

- Golfs every Friday at RNZAF Golf Club, Whenuapai. This is protected time.
- Coaches Jax's rugby team — this is important to him, not just a calendar entry.
- Family is central. Sarah, Sammy, and Jax are not just contacts — they matter.
- He had a boat previously and used to tow regularly. No longer does, but may again.
- Carries 2 sets of golf clubs when travelling (cargo consideration).

---

_Update this file periodically. Extract insights from daily memory. Remove anything no longer relevant._
