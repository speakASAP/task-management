# 🚀 Standalone MCP Todo Server

**Zero Dependencies • File-Based Storage • Works Immediately**

A completely standalone MCP (Model Context Protocol) todo server that works with Cursor IDE without any external dependencies like Docker, Redis, or databases.

## ✨ Features

- **🎯 Zero Dependencies** - No Docker, Redis, or external databases required
- **📁 File-Based Storage** - Data stored in simple JSON files
- **🔄 Project Management** - Automatic project-based task isolation
- **⚡ Priority System** - 1-10 priority scale with smart sorting
- **🏷️ Tagging System** - Organize tasks with custom tags
- **📊 Smart Analysis** - Get completion rates and insights
- **💾 Persistent Storage** - Tasks survive restarts
- **🚀 Instant Setup** - Works immediately after installation

## 🚀 Quick Start

### 1. Install

```bash
# Clone or download this repository
git clone <your-repo-url>
cd task-management

# Run the installation script
./install-standalone.sh
```

### 2. Use in Cursor

1. **Restart Cursor IDE**
2. **Open Command Palette** (`Cmd+Shift+P` or `Ctrl+Shift+P`)
3. **Type:** `MCP: Connect to Server`
4. **Select:** `mcp-todo-standalone`

### 3. Start Managing Tasks

```javascript
// Add a task
todo_add("Fix authentication bug", 8, ["urgent", "backend"])

// List all tasks
todo_list()

// List only pending tasks
todo_list("pending")

// Mark task as done
todo_mark_done("todo_1234567890_abc123")

// Remove a task
todo_remove("todo_1234567890_abc123")

// Clear all tasks
todo_clear()

// Get analysis
todo_analyze()

// Set project context
project_set("/path/to/my/project", "My Awesome Project")
```

## 📋 Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `todo_add` | Add a new todo item | `name` (required), `priority` (1-10), `tags` (array) |
| `todo_list` | List all todos | `status` (optional: "pending", "completed", "all") |
| `todo_mark_done` | Mark todo as completed | `id` (required) |
| `todo_remove` | Remove a todo by ID | `id` (required) |
| `todo_clear` | Clear all todos | None |
| `todo_analyze` | Get task analysis | None |
| `project_set` | Set project context | `path` (required), `name` (optional) |

## 🗂️ Project Management

The server automatically manages different projects:

- **Default Project:** Tasks without a specific project go to "default"
- **Project Isolation:** Each project has its own task list
- **Automatic Detection:** Set project context with `project_set()`
- **Persistent Storage:** Project data is saved between sessions

## 💾 Data Storage

All data is stored in the `.mcp-todo-data/` directory:

```
.mcp-todo-data/
├── todos.json      # All todo items
└── projects.json   # Project definitions
```

**Data Format:**

```json
{
  "todo_1234567890_abc123": {
    "id": "todo_1234567890_abc123",
    "name": "Fix authentication bug",
    "status": "pending",
    "createdAt": "2025-10-04T12:00:00.000Z",
    "updatedAt": "2025-10-04T12:00:00.000Z",
    "priority": 8,
    "tags": ["urgent", "backend"],
    "projectId": "/path/to/project"
  }
}
```

## 🔧 Manual Installation

If you prefer manual installation:

1. **Install dependencies:**

   ```bash
   npm install uuid
   ```

2. **Build the server:**

   ```bash
   npx tsc src/standalone-unified-server.ts --outDir dist --target ES2022 --module ESNext --moduleResolution node --allowSyntheticDefaultImports --esModuleInterop
   ```

3. **Configure Cursor:**
   Edit `~/.cursor/mcp.json`:

   ```json
   {
     "mcpServers": {
       "mcp-todo-standalone": {
         "command": "node",
         "args": ["/path/to/your/task-management/dist/standalone-unified-server.js"],
         "cwd": "/path/to/your/task-management"
       }
     }
   }
   ```

## 🎯 Use Cases

### For Developers

- **Bug Tracking** - Track bugs with priorities and tags
- **Feature Development** - Manage feature tasks and milestones
- **Code Reviews** - Track review tasks and assignments
- **Sprint Planning** - Organize work by priority and project

### For Teams

- **Shared Projects** - Use same project directory for team tasks
- **Progress Tracking** - Monitor completion rates across projects
- **Priority Management** - Focus on high-priority items first

### For Students

- **Assignment Tracking** - Manage homework and project deadlines
- **Study Planning** - Organize study sessions and materials
- **Exam Preparation** - Track topics to review and practice

## 🚨 Troubleshooting

**Server won't start:**

- Check that Node.js is installed: `node --version`
- Verify the file path in `~/.cursor/mcp.json` is correct
- Check Cursor's developer console for error messages

**Tasks not saving:**

- Ensure the `.mcp-todo-data/` directory exists and is writable
- Check file permissions in the project directory

**Cursor integration not working:**

- Restart Cursor IDE after configuration changes
- Check that the MCP server is enabled in Cursor settings
- Verify the server name matches in `mcp.json`

## 🔄 Migration from Redis Version

If you were using the Redis-based version:

1. **Export your data** from Redis (if needed)
2. **Install the standalone version** using the script above
3. **Manually add tasks** using `todo_add()` commands
4. **Remove Redis dependencies** from your system

## 📊 Performance

- **Startup Time:** < 100ms
- **Memory Usage:** < 10MB
- **Storage:** JSON files (human-readable)
- **Concurrent Users:** Single-user (per project directory)

## 🛠️ Development

**File Structure:**

```
src/
├── standalone-unified-server.ts  # Main server implementation
└── web-ui/                       # Web interface (optional)

dist/
└── standalone-unified-server.js  # Compiled server

.mcp-todo-data/                   # Data storage
├── todos.json
└── projects.json
```

**Key Features:**

- **File-based persistence** - No external database
- **Project isolation** - Automatic task separation
- **Priority sorting** - Smart task ordering
- **Error handling** - Graceful failure recovery
- **Debug logging** - Console output for troubleshooting

## 📝 License

MIT License - Feel free to use, modify, and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Issues:** Create an issue on GitHub
- **Discussions:** Use GitHub Discussions for questions
- **Documentation:** Check this README and inline comments

---

**🎉 Enjoy your dependency-free MCP todo server!**

No Docker, no Redis, no external databases - just pure Node.js and file storage. Perfect for developers who want simplicity and reliability.
