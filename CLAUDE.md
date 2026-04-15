# CLAUDE.md (task-management)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first. Implementation detail: `README.md`, `docs/`.

---

## task-management

**Purpose**: MCP todo server + web UI for unified task management across projects. Used by developers via Cursor IDE and MCP clients.  
**Stack**: Node.js MCP server · HTTP API · SQLite (central DB under user home) · Docker

### Key constraints
- Never delete or merge user tasks without explicit instruction
- No secrets in repo — use `env.example` and local `.env` only
- SQLite DB lives under user home — not in the repo

### Key docs
- `README.md` — setup and MCP integration
- `docs/CURSOR_INTEGRATION.md` — Cursor IDE integration
- Optional: OpenAI/OpenRouter for AI task prioritization (via env)

### Quick ops
```bash
docker compose logs -f
./scripts/deploy.sh
```
