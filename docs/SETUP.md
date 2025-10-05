# 🚀 MCP Todo Server - Setup Guide

This guide helps you integrate the MCP Todo Server into Cursor IDE for seamless task management across all your projects.

## 🎯 What This Gives You

- **Unified Task Management** - Manage todos across all your projects
- **Cursor IDE Integration** - Use todo commands directly in Cursor chat
- **Web Interface** - Beautiful web UI for task management
- **Project Organization** - Automatic project detection and isolation
- **AI Analysis** - Smart task prioritization (optional)
- **No External Dependencies** - Works offline with SQLite

## 🚀 Quick Setup (2 minutes)

### For New Users

1. **Clone the repository**

   ```bash
   git clone https://github.com/speakASAP/task-management.git
   cd task-management
   ```

2. **Run the setup script**

   ```bash
   ./setup.sh
   ```

3. **Restart Cursor IDE**

4. **Start the server**

   ```bash
   npm start
   ```

5. **Open web UI**: <http://localhost:3300>

### For Updates (After Git Pull)

1. **Pull latest changes**

   ```bash
   git pull
   ```

2. **Run the setup script**

   ```bash
   ./setup.sh
   ```

3. **Restart Cursor IDE**

4. **Start the server**

   ```bash
   npm start
   ```

## 💬 Using in Cursor IDE

Once set up, you can use these commands in any Cursor chat:

### Basic Commands

```javascript
// Add a new task
todo_add("Fix authentication bug", 7, ["backend", "security"])

// List all tasks
todo_list()

// List only pending tasks
todo_list("pending")

// List completed tasks
todo_list("completed")

// Mark a task as done
todo_mark_done("task-id-here")

// Remove a task
todo_remove("task-id-here")

// Clear all tasks for current project
todo_clear()

// Set project context
project_set("/path/to/project", "My Project Name")
```

### Advanced Commands

```javascript
// Add task with detailed instructions
todo_add("Implement user authentication", 5, ["auth", "security"], "Implement JWT-based authentication with refresh tokens, password hashing, and session management")

// Get AI analysis of tasks
todo_analyze()

// Set project and add tasks
project_set("/Users/john/projects/my-app", "My App")
todo_add("Fix login bug", 8, ["urgent", "auth"])
```

## 🌐 Web Interface

Access the web UI at **<http://localhost:3300>** for:

- ➕ **Add Tasks** - Create new tasks with priorities and tags
- 📋 **Task List** - View, filter, and manage all tasks
- ✅ **Mark Complete** - Check off completed tasks
- 🗑️ **Delete Tasks** - Remove unwanted tasks
- 📊 **Statistics** - Track your productivity
- 🏷️ **Filtering** - Filter by status (all/pending/completed)
- 🔄 **Project Switching** - Switch between different projects

## 🔧 Configuration

### Environment Variables (Optional)

Create a `.env` file for custom configuration:

```env
# Server Configuration
SERVER_PORT=3300
NODE_ENV=production

# OpenAI Configuration (optional - for AI analysis)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_BASE_URL=https://api.openai.com/v1

# Logging
LOG_LEVEL=info

# AI Analysis Configuration
AI_ANALYSIS_ENABLED=true
AI_ANALYSIS_CACHE_TTL=300
AI_ANALYSIS_BATCH_SIZE=10
```

### Cursor Configuration

The setup script automatically configures Cursor IDE by creating/updating `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mcp-todo-server": {
      "command": "node",
      "args": ["/path/to/task-management/dist/todo-server.js", "--stdio"],
      "cwd": "/path/to/task-management",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## 🛠️ Available Commands

### Server Commands

```bash
npm start              # Start production server
npm run dev            # Start development server (auto-reload)
npm run build          # Build TypeScript to JavaScript
npm run mcp            # Start MCP server for Cursor
npm run install-cursor # Install/update Cursor configuration
npm test               # Run tests
```

### Troubleshooting Commands

```bash
# Check if server is running
lsof -i :3300

# Test server health
curl http://localhost:3300/health

# Reinstall Cursor configuration
npm run install-cursor

# Reset database (if needed)
rm mcp-todo.db
npm start
```

## 🎯 Project Organization

### Automatic Project Detection

The server automatically detects your current project based on the working directory:

- **Project A**: `/Users/john/projects/project-a` → Separate todo list
- **Project B**: `/Users/john/projects/project-b` → Separate todo list
- **Personal**: `/Users/john/documents` → Personal todo list

### Manual Project Switching

```javascript
// Switch to a specific project
project_set("/Users/john/projects/my-app", "My App")

// Now all todo commands will work in this project context
todo_add("Fix bug in user service", 6, ["backend"])
```

## 🔄 Daily Workflow

### Your Daily Workflow

1. **Start your day**

   ```bash
   npm start
   ```

2. **Open Cursor IDE** (it will automatically connect to the MCP server)

3. **Check your tasks**

   ```javascript
   todo_list("pending")
   ```

4. **Add new tasks as you work**

   ```javascript
   todo_add("Implement new feature", 5, ["frontend"])
   ```

5. **Mark tasks complete**

   ```javascript
   todo_mark_done("task-id")
   ```

### Project Switching

When switching between projects:

1. **Open the new project in Cursor**
2. **The server automatically detects the project change**
3. **All todo commands now work in the new project context**

## 🐛 Troubleshooting

### Common Issues

**Server won't start:**

```bash
# Check if port is available
lsof -i :3300

# Try different port
SERVER_PORT=3301 npm start
```

**Cursor integration not working:**

```bash
# Reinstall Cursor configuration
npm run install-cursor

# Restart Cursor IDE
```

**Database issues:**

```bash
# Reset database
rm mcp-todo.db
npm start
```

**Build issues:**

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

## 📚 Additional Resources

- **Main README**: `README.md` - Complete project documentation
- **API Documentation**: `docs/README.md` - Detailed API reference
- **Implementation Docs**: `docs/IMPLEMENTATION_DOCS.md` - Technical details
- **Web UI Guide**: `src/web-ui/web-ui-README.md` - Web interface guide

## 🎉 Benefits

### For Developers

- **Unified Task Management** - All projects in one place
- **Cursor Integration** - No context switching needed
- **Project Isolation** - Clean separation between projects
- **Web Interface** - Visual task management

### For Productivity

- **Real-time Visibility** - See what you're working on
- **Priority Management** - Focus on high-priority tasks
- **Progress Tracking** - Monitor completion rates
- **AI Analysis** - Smart task prioritization

### For Everyone

- **Easy Setup** - Up and running in 2 minutes
- **No Infrastructure** - No servers or databases to manage
- **Offline Capable** - Works without internet
- **Cross-Platform** - Works on any operating system

## 🚀 Next Steps

1. **Run the setup script**: `./setup.sh`
2. **Restart Cursor IDE**
3. **Start the server**: `npm start`
4. **Open web UI**: <http://localhost:3300>
5. **Start managing tasks!**

---

**Need help?** Check the troubleshooting section or create an issue in the repository.

**Happy task managing!** 🎯✨
