# System: task-management

## Architecture

- Node.js MCP + HTTP API; SQLite central DB under user home (see `README.md`).
- Docker deployment via `docker-compose.yml` / `Dockerfile`.

## Integrations

- Optional OpenAI/OpenRouter for prioritization (configured via env).

## Current State

Stage: active

## Known Issues

- See `docs/` and `CURSOR_INTEGRATION.md` for integration notes.
