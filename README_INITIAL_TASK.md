# MCP server todo application

## Introduction

Multi-node todo application using an MCP server that can handle distributed clients and maintain a consistent state across multiple server instances.

The application should expose MCP tools over HTTP and use Redis for storing todos and session data.

### Core functionality

- Implement MCP tools: `todo_add(name)`, `todo_list()`, `todo_remove(id)`, `todo_clear()`, `todo_mark_done(id)`, `todo_analyze()`
- Store todos in Redis with todo status (pending/completed)
- Add AI-powered todo analysis using OpenAI to recommend the highest impact tasks 🤖
- Expose MCP over Streamable HTTP at `/mcp` endpoint
- Provide `/health` endpoint
- Allow requests for the same session to land on any node (no sticky sessions)
- Provide Docker Compose with 2 nodes, Redis, and Caddy load balancer (skeleton provided)

### Technical requirements

- Python or TypeScript project
- Redis for state management
- Caddy for load balancing (round-robin)
- OpenAI integration for AI analysis (you don't need to use OpenAI, any other provider is fine but make sure we can run it (e.g. using OpenRouter))
- Docker containerization

## Solution process

1. Develop your solution in Python/TypeScript within the `./src` directory
2. Write a concise README.md explaining how to run the solution

## Deliverables

- Source code
- `Dockerfile` for containerization
- `docker-compose.yml` with multi-node setup
- `README.md` with setup instructions and usage examples

## MCP client compatibility

Your MCP server should work with standard MCP clients such as:

- **VS Code** with MCP extensions
- **Cursor** with MCP integration
- **OpenCode** or other MCP-compatible editors

Test your implementation by connecting these clients to your server and verifying that all tools work correctly.

## End-user evaluation (bonus 🎁)

Evaluate your solution from an end-user perspective!
