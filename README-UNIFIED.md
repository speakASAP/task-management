# 🚀 MCP Todo Server

**Unified Task Management for Cursor IDE with Web UI**

A production-ready MCP (Model Context Protocol) server that provides intelligent task management for Cursor IDE, featuring both MCP protocol support and a modern web interface. No Docker required - just install and go!

## ✨ Features

- 🎯 **MCP Protocol Support** - Seamless integration with Cursor IDE
- 🌐 **Modern Web UI** - Beautiful, responsive task management interface
- 📁 **Project-Based Organization** - Different task lists for different projects
- 🏷️ **Priority & Tagging** - Organize tasks with priorities and custom tags
- 💾 **SQLite Storage** - No external dependencies, works offline
- ⚡ **Easy Installation** - One command setup
- 🔄 **Auto-Configuration** - Automatically detects and configures projects
- 📊 **Real-time Stats** - Track completion rates and productivity

## 🚀 Quick Start

### Installation

```bash
# Install globally
npm install -g mcp-todo-server

# Or use without installation
npx mcp-todo-server
```

### Setup for Cursor IDE

```bash
# Install Cursor configuration
mcp-todo-server --install-cursor

# Restart Cursor IDE
```

### Start the Server

```bash
# Start HTTP server with web UI
mcp-todo-server

# Or start on specific port
mcp-todo-server --port 3300
```

### Access Web UI

Open your browser to: **<http://localhost:${SERVER_PORT:-3300}>**

## 🎯 Usage

### In Cursor IDE

Once configured, you can use these commands in Cursor's chat:

```javascript
// Add a new task
todo_add("Fix authentication bug", 7, ["backend", "security"])

// List all tasks
todo_list()

// List pending tasks only
todo_list("pending")

// Mark task as completed
todo_mark_done("task-id-here")

// Remove a task
todo_remove("task-id-here")

// Clear all tasks
todo_clear()

// Set project context
project_set("/path/to/project", "My Project")
```

### Web Interface

The web UI provides:

- ➕ **Add Tasks** - Create new tasks with priorities and tags
- 📋 **Task List** - View, filter, and manage all tasks
- ✅ **Mark Complete** - Check off completed tasks
- 🗑️ **Delete Tasks** - Remove unwanted tasks
- 📊 **Statistics** - Track your productivity
- 🏷️ **Filtering** - Filter by status (all/pending/completed)

## 🛠️ Commands

### CLI Commands

```bash
# Start HTTP server
mcp-todo-server

# Start MCP server for Cursor
mcp-todo-server --stdio

# Install Cursor configuration
mcp-todo-server --install-cursor

# Start on specific port
mcp-todo-server --port 3300

# Show help
mcp-todo-server --help
```

### MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `todo_add` | Add a new task | `name` (required), `priority?`, `tags?` |
| `todo_list` | List tasks | `status?` (pending/completed/all) |
| `todo_mark_done` | Mark task complete | `id` (required) |
| `todo_remove` | Remove task | `id` (required) |
| `todo_clear` | Clear all tasks | None |
| `project_set` | Set project context | `path` (required), `name?` |

## 🏗️ Architecture

### Project Structure

```text
mcp-todo-server/
├── src/
│   ├── unified-server.ts      # Main server implementation
│   └── web-ui/                # Web interface
├── bin/
│   └── mcp-todo-server.js     # CLI executable
├── scripts/
│   └── install-cursor.js      # Cursor installation
└── package.json
```

### Storage

- **SQLite Database** - Local file storage (`mcp-todo.db`)
- **Project-based** - Tasks organized by project directory
- **No External Dependencies** - Works completely offline

### Interfaces

1. **MCP Protocol** - For Cursor IDE integration
2. **HTTP API** - For web UI and external access
3. **Web UI** - Modern, responsive interface

## 🔧 Configuration

### Environment Variables

```bash
PORT=3300                    # HTTP server port
NODE_ENV=production          # Environment mode
```

### Cursor Configuration

The installer automatically creates/updates `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mcp-todo-server": {
      "command": "node",
      "args": ["/path/to/mcp-todo-server/dist/unified-server.js", "--stdio"],
      "cwd": "/path/to/project",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 📊 API Endpoints

### HTTP API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/todos` | List all tasks |
| POST | `/api/todos` | Create new task |
| PUT | `/api/todos/:id/done` | Mark task complete |
| DELETE | `/api/todos/:id` | Delete task |
| DELETE | `/api/todos` | Clear all tasks |

### Example API Usage

```bash
# Get all tasks
curl http://localhost:${SERVER_PORT:-3300}/api/todos

# Add a task
curl -X POST http://localhost:${SERVER_PORT:-3300}/api/todos \
  -H "Content-Type: application/json" \
  -d '{"name": "Fix bug", "priority": 7, "tags": ["urgent"]}'

# Mark task complete
curl -X PUT http://localhost:${SERVER_PORT:-3300}/api/todos/task-id/done
```

## 🚀 Development

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/your-username/mcp-todo-server.git
cd mcp-todo-server

# Install dependencies
npm install

# Build the project
npm run build

# Start development server
npm run dev
```

### Project Scripts

```bash
npm run build          # Build TypeScript
npm run start          # Start production server
npm run dev            # Start development server
npm run mcp            # Start MCP server
npm run install-cursor # Install Cursor config
npm test               # Run tests
```

## 🎯 Use Cases

### For Developers

- **Project Management** - Track features, bugs, and tasks
- **Sprint Planning** - Organize work by priority and tags
- **Code Reviews** - Track review tasks and follow-ups
- **Documentation** - Manage writing and update tasks

### For Teams

- **Shared Task Lists** - Use same project directory for shared tasks
- **Progress Tracking** - Monitor completion rates and productivity
- **Priority Management** - Focus on high-priority items first

### For Students

- **Assignment Tracking** - Manage homework and project deadlines
- **Study Planning** - Organize study sessions and materials
- **Goal Setting** - Break down large goals into manageable tasks

## 🔒 Security

- **Local Storage** - All data stored locally in SQLite
- **No External Dependencies** - No data sent to external services
- **Project Isolation** - Tasks isolated by project directory
- **No Authentication Required** - Simple, local-first approach

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**

```bash
# Check if port is available
lsof -i :3300

# Try different port
mcp-todo-server --port ${NODE_1_PORT:-3301}
```

**Cursor integration not working:**

```bash
# Reinstall Cursor config
mcp-todo-server --install-cursor

# Restart Cursor IDE
```

**Database issues:**

```bash
# Delete database file to reset
rm mcp-todo.db

# Restart server
mcp-todo-server
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=mcp-todo-server:* mcp-todo-server
```

## 📈 Roadmap

- [ ] **AI Integration** - Smart task prioritization
- [ ] **Team Collaboration** - Multi-user support
- [ ] **Export/Import** - Backup and restore tasks
- [ ] **Mobile App** - React Native companion
- [ ] **Integrations** - GitHub, Jira, Trello sync
- [ ] **Analytics** - Productivity insights and reports

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) for the MCP standard
- [Cursor IDE](https://cursor.sh/) for the amazing development environment
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3) for fast SQLite operations

---

**Made with ❤️ for the Cursor community**

[GitHub](https://github.com/your-username/mcp-todo-server) • [Issues](https://github.com/your-username/mcp-todo-server/issues) • [Discussions](https://github.com/your-username/mcp-todo-server/discussions)
