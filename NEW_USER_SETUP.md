# 🚀 New User Setup Guide

This guide will help you set up the MCP Todo Server for the first time, including both MCP integration with Cursor IDE and the web UI.

## 📋 Prerequisites

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Cursor IDE** (for MCP integration)
- **Git** (for cloning the repository)

## 🎯 Quick Setup (Recommended)

### Option 1: One-Command Setup

```bash
git clone https://github.com/speakASAP/task-management.git
cd task-management
npm run setup
```

This single command will:
- ✅ Install all dependencies
- ✅ Build the project
- ✅ Configure Cursor IDE for MCP integration
- ✅ Install the universal client
- ✅ Start the server with both MCP and HTTP interfaces
- ✅ Provide usage instructions

### Option 2: Shell Script Setup

```bash
git clone https://github.com/speakASAP/task-management.git
cd task-management
./setup.sh
```

## 🔧 What Happens During Setup

### 1. **MCP Server Installation**
- Creates `~/.cursor/mcp.json` configuration
- Registers the MCP Todo Server with Cursor IDE
- Enables MCP tools in Cursor chat

### 2. **Universal Client Installation**
- Installs `mcp-todo` command globally
- Enables terminal-based task management
- Works from any project directory

### 3. **Server Startup**
- Starts both MCP server (for Cursor IDE)
- Starts HTTP server (for web UI at localhost:3300)
- Provides real-time feedback

## 🌐 After Setup

### **Web Interface**
- Open: `http://localhost:3300`
- Modern web UI for task management
- View all projects and tasks
- Real-time updates

### **Cursor IDE Integration**
- Restart Cursor IDE to load MCP configuration
- Use MCP tools in chat:
  - `todo_add("Task name", priority?, tags?)`
  - `todo_list("pending" | "completed" | "all")`
  - `todo_mark_done("task-id")`
  - `todo_remove("task-id")`
  - `todo_clear()`
  - `project_set("/path/to/project", "Project Name")`

### **Terminal Commands**
- `mcp-todo set-workspace` - Set current directory as active project
- `mcp-todo list-todos` - List current todos
- `mcp-todo add-todo "Task"` - Add new todo
- `mcp-todo --help` - Show all commands

## 🎯 First Steps

1. **Restart Cursor IDE** to load MCP configuration
2. **Open web UI** at `http://localhost:3300`
3. **Set your workspace** by running `mcp-todo set-workspace` from your project directory
4. **Start using** MCP tools in Cursor chat or the web interface

## 🔄 Daily Usage

### **Starting the Server**
```bash
cd task-management
npm start
```

### **Stopping the Server**
- Press `Ctrl+C` in the terminal where the server is running
- Or use: `pkill -f "node dist/todo-server.js"`

### **Switching Projects**
```bash
cd /path/to/your/project
mcp-todo set-workspace
```

## 🆘 Troubleshooting

### **Server Won't Start**
- Check if port 3300 is available: `lsof -i :3300`
- Kill existing processes: `pkill -f "node dist/todo-server.js"`
- Try: `npm start`

### **MCP Tools Not Working in Cursor**
- Restart Cursor IDE completely
- Check `~/.cursor/mcp.json` exists
- Verify server is running: `http://localhost:3300/health`

### **Universal Client Not Found**
- Reinstall: `npm run install-universal-client`
- Check PATH: `echo $PATH`
- Try: `npx mcp-todo --help`

### **Web UI Not Loading**
- Check server is running: `http://localhost:3300/health`
- Try different browser
- Check firewall settings

## 📚 Additional Resources

- **Main README**: [README.md](README.md)
- **Universal Client Guide**: [UNIVERSAL_CLIENT_README.md](UNIVERSAL_CLIENT_README.md)
- **Cursor Integration**: [CURSOR_INTEGRATION.md](CURSOR_INTEGRATION.md)
- **API Documentation**: [API.md](API.md)

## 🎉 You're All Set!

The MCP Todo Server is now fully integrated with your development workflow. You can:

- ✅ Manage tasks from Cursor IDE chat
- ✅ Use the web interface for visual task management
- ✅ Switch between projects seamlessly
- ✅ Access all features from any directory

**Happy task managing!** 🚀

