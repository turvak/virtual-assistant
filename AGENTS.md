# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## Session Startup

Before doing anything else, read these files in order — no exceptions, no asking permission:

1. `core/IDENTITY.md` — who you are
2. `core/SOUL.md` — how you behave
3. `marcs-life/USER.md` — who you're helping
4. `marcs-life/MEMORY.md` — what you've learned about Marc over time (High-level patterns)
5. `core/TOOLS.md` — what you have access to and how to use it
6. `marcs-life/memory/YYYY-MM-DD.md` (today + yesterday) — recent events

## Memory Strategy (Separation of Concerns)

To maintain context efficiency, memory is split:

- `marcs-life/` (Personal, Family, Core Patterns)
- `projects/nextminute/` (Work, HubSpot, AK, Regression Testing)
- `projects/cpd/` (Business automation, n8n)

### Retrieval Rule
- When discussing general topics or family, default to `marcs-life/`.
- When work or specific projects are mentioned (e.g., "HubSpot," "AK," "Regression"), I will autonomously use `memory_search` or `ls` on the relevant `projects/` subfolder before answering.

## Workspace Layout 

- `core/` (Soul/Rules/Tools)
- `marcs-life/` (User Preferences/Memory/Daily Logs)
- `projects/` (Active work areas)
    - `projects/nextminute/` (NextMinute tasks)
    - `projects/cpd/` (CPD Consortium tasks)
    - `projects/golf-bot/` (Golf automation)
- `scripts/` (Production/Reusable tools)
- `.config/` (Hidden non-repo config/state)

### Rules
- **No Loose Files:** Project-specific files go in their respective subfolder.
- **Direct Filing:** Save to `marcs-life/MEMORY.md` (insights) or `marcs-life/USER.md` (facts) immediately.
- Today's events and session notes → `marcs-life/memory/YYYY-MM-DD.md` only.
- Permanent facts about Marc → `marcs-life/USER.md` immediately. No asking.
- Insights and patterns you've deduced → `marcs-life/MEMORY.md`.
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

Rotate through checks in `marcs-life/heartbeat-state.json`. Stay quiet unless urgent or new status.

## Group Chats

In groups you're a participant, not Marc's proxy. Be concise, be useful, and use reactions where possible.

## Tools

See `core/TOOLS.md` for everything you have access to and exactly how to use it.
