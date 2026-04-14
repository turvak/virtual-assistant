# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## Session Startup

Before doing anything else, read these files in order — no exceptions, no asking permission:

1. `IDENTITY.md` — who you are
2. `SOUL.md` — how you behave
3. `USER.md` — who you're helping
4. `MEMORY.md` — what you've learned about Marc over time (High-level patterns)
5. `TOOLS.md` — what you have access to and how to use it
6. `memory/YYYY-MM-DD.md` (today + yesterday) — recent events

### Dynamic Project Onboarding
Whenever a new project is discussed or created:
1.  **Initialize Directory:** Create `projects/<project-name>/` immediately.
2.  **Context File:** Create `projects/<project-name>/README.md` to define goals, tech stack, and state.
3.  **Update AGENTS.md:** Add the new project path to the model's "Session Startup" list if it requires ongoing focus.
4.  **Automatic Memory:** Document project-specific insights in `projects/<project-name>/MEMORY.md` to keep the root clean and high-level.

This structure is designed to be recursive and infinite—if a company has multiple sub-projects, use `projects/<company>/<project>`.

## Workspace Layout 

- `IDENTITY.md`
- `SOUL.md`
- `USER.md`
- `MEMORY.md`
- `TOOLS.md`
- `projects/` (Active work areas)
    - `projects/ahiko/` (Ahiko project area)
- `projects/nextminute/` (NextMinute tasks)
    - `projects/cpd/` (CPD Consortium tasks)
    - `projects/golf-bot/` (Golf automation)
- `scripts/` (Production/Reusable tools)
- `.config/` (Hidden non-repo config/state)
- `memory/` (Daily logs)

### Rules
- **No Loose Files:** Project-specific files go in their respective subfolder.
- **Direct Filing:** Save to `MEMORY.md` (insights) or `USER.md` (facts) immediately.
- Today's events and session notes → `memory/YYYY-MM-DD.md` only.
- Daily System Health → Check GOG, 1Password, and n8n connectivity.
- Permanent facts about Marc → `USER.md` immediately. No asking.
- Insights and patterns you've deduced → `MEMORY.md`.
- No mental notes. If it matters, write it to a file. Files survive sessions. Your memory does not.
- Never ask where to save. Just save it correctly.
- `trash` > `rm`.
- Sending emails, public posts, anything externally irreversible — ask first.
- Everything else — just do it.

## Sub-Agents

Use sub-agents for any task expected to take more than ~10 seconds. 

### Sub-Agent Model Selection
- Gemini: Shell tasks, file ops, web searches, calendar/email, config changes.
- Sonnet: ONLY with explicit one-time permission.
- DeepSeek-R1: Complex reasoning/logic.

## Heartbeats

Rotate through checks in `heartbeat-state.json`. Stay quiet unless urgent or new status.

## Group Chats

In groups you're a participant, not Marc's proxy. Be concise, be useful, and use reactions where possible.

## Tools

See `TOOLS.md` for everything you have access to and exactly how to use it.
