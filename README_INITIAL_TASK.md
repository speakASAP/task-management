# MCP server todo application

## Introduction

Apify is a cloud platform that helps you build reliable web scrapers quickly and automate anything you can do manually in a web browser.

In the [Apify Store](https://apify.com/store), we offer thousands of ready-made web scrapers (Actors) that anyone can use to extract data from virtually any website.
A typical user journey starts with discovering an Actor 🔎 (discoverability), testing if it works for their use case 🧪, and then either running it manually ✋ or integrating it into their workflow via our REST API ⚙️.

With the rise of Large Language Models (LLMs) and AI agents that can directly interact with tools and APIs, this journey is evolving.
The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/docs/getting-started/intro) plays a key role here: it provides a unified way for LLMs to connect with third-party APIs.
This improves discoverability, usability, and enables faster integration.
At Apify, we see it as a huge opportunity.
That’s why we are building [Apify MCP server](https://mcp.apify.com) that empowers users, developers, and AI agents to access and use web data more easily.

## Task specification

In this assignment, we would like you to build an MCP server that can be used for task prioritization.
Imagine you have a large number of tasks to complete and you want to manage them effectively. You should be able to add new tasks, list existing tasks, remove completed tasks, and include smart analysis to prioritize them.

While this could be implemented as a simple application using a single MCP server, we’d like you to go a step further and create a multi-node architecture that can handle distributed clients and maintain a consistent state across multiple server instances.

If you are not familiar with MCP, you will most likely want to start with the [MCP documentation](https://modelcontextprotocol.io/docs/getting-started/intro)
to understand the protocol and how to implement MCP servers and tools.

## Requirements

We’d like you to implement a multi-node todo application using an MCP server that can handle distributed clients and maintain a consistent state across multiple server instances.

The application should expose MCP tools over HTTP and use Redis for storing todos and session data.
Of course, redis is not the only possible solution for storage, but since we use it internally (for caching, pub/sub, etc.), please use it as well! Thank you! 🚀

### Core functionality

- Implement MCP tools: `todo_add(name)`, `todo_list()`, `todo_remove(id)`, `todo_clear()`, `todo_mark_done(id)`, `todo_analyze()`
- Store todos in Redis with todo status (pending/completed)
- Add AI-powered todo analysis using OpenAI to recommend the highest impact tasks 🤖
- Expose MCP over Streamable HTTP at `/mcp` endpoint
- Provide `/health` endpoint
- Allow requests for the same session to land on any node (no sticky sessions)
- Provide Docker Compose with 2 nodes, Redis, and Caddy load balancer (skeleton provided)

### Technical requirements

- Python or TypeScript project (choose language you are most comfortable with)
- Redis for state management
- Caddy for load balancing (round-robin)
- OpenAI integration for AI analysis (you don't need to use OpenAI, any other provider is fine but make sure we can run it (e.g. using OpenRouter))
- Docker containerization

## Solution process

1. Develop your solution in Python/TypeScript within the `./src` directory
2. Write a concise README.md explaining how to run the solution, your approach, and any key decisions or challenges
3. Submit your solution as a pull request to the GitHub repository, including the time spent on the task 🚀

## Deliverables

- Source code
- `Dockerfile` for containerization
- `docker-compose.yml` with multi-node setup
- `README.md` with setup instructions and usage examples
- Time spent on the task

## Timebox 🕓

Please aim to spend about 4 hours on the task (excluding time to read MCP docs).
Once you start the task, please have the timebox in mind and focus on delivering the core functionality.

## MCP client compatibility

Your MCP server should work with standard MCP clients such as:

- **VS Code** with MCP extensions
- **Cursor** with MCP integration
- **OpenCode** or other MCP-compatible editors

Test your implementation by connecting these clients to your server and verifying that all tools work correctly.

## End-user evaluation (bonus 🎁)

Evaluate your solution from an end-user perspective!

## AI usage 🦾

While you may use AI tools to support your work on this assignment, our primary goal is to assess your current knowledge, critical thinking, and understanding of the assignment's core objectives.
Please note the AI tools you used in the pull request description and be prepared to defend your AI methodologies and share all relevant prompts during your presentation, demonstrating your problem-solving process.
