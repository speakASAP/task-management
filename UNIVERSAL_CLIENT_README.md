# Universal MCP Client for Cursor IDE

This document explains how to use the Universal MCP Client to interact with the MCP Todo Server from any Cursor IDE workspace.

## Problem Solved

The MCP Todo Server runs 24/7 but doesn't automatically detect which Cursor IDE workspace is currently active. Users need a way to tell the server which project they're working on without hardcoded paths.

## Solution

The Universal MCP Client uses the existing MCP server tools (`project_set`, `todo_list`, etc.) via the HTTP API to provide a portable solution that works from any directory.

## Installation

### Option 1: Local Installation (Recommended)

```bash
cd /path/to/task-management
node scripts/install-universal-client.js local
```

This installs the client to `~/.local/bin/mcp-todo` and adds it to your PATH.

### Option 2: System-wide Installation

```bash
cd /path/to/task-management
node scripts/install-universal-client.js system
```

This installs the client to `/usr/local/bin/mcp-todo` (requires sudo).

### Option 3: Manual Installation

Copy the universal client to any directory in your PATH:

```bash
cp scripts/universal-mcp-client.js /usr/local/bin/mcp-todo
chmod +x /usr/local/bin/mcp-todo
```

## Usage

### Basic Commands

```bash
# Set current directory as active project
mcp-todo set-workspace

# List all todos
mcp-todo list-todos

# Add a new todo
mcp-todo add-todo "Fix bug in login"

# Add a high-priority todo
mcp-todo add-todo "Critical security fix" 1

# Show help
mcp-todo help
```

### From Any Cursor IDE Workspace

1. Open your Cursor IDE workspace
2. Open the terminal
3. Run: `mcp-todo set-workspace`
4. The MCP Todo Server will switch to your current project
5. View tasks at: http://localhost:3300

## How It Works

1. **Detection**: The client detects the current working directory (Cursor IDE workspace)
2. **Project Name**: Extracts project name from `package.json` or uses directory name
3. **API Call**: Uses the existing MCP server HTTP API (`/api/project`)
4. **Update**: The MCP Todo Server updates its active project context
5. **Confirmation**: Shows success message with project details

## Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `set-workspace` | Set current directory as active project | `mcp-todo set-workspace` |
| `list-todos` | List all todos for current project | `mcp-todo list-todos` |
| `add-todo "Task"` | Add a new todo (priority 5) | `mcp-todo add-todo "Fix bug"` |
| `add-todo "Task" 1` | Add a high-priority todo | `mcp-todo add-todo "Critical fix" 1` |
| `help` | Show help message | `mcp-todo help` |

## Example Workflow

```bash
# You're working in /Users/john/Documents/MyProject
cd /Users/john/Documents/MyProject

# Set this as the active project
mcp-todo set-workspace
# Output:
# 🔍 Cursor IDE Workspace Detected:
# 📁 Path: /Users/john/Documents/MyProject
# 📝 Name: MyProject
# 🔄 Setting project context...
# ✅ Project set successfully!
# 🎉 Active Project: MyProject
# 📍 Path: /Users/john/Documents/MyProject
# 
# 🌐 View your tasks at: http://localhost:3300

# List current todos
mcp-todo list-todos
# Output:
# 📋 Current Todos (5 total):
#    Pending: 3
#    Completed: 2
# 
# 📝 Tasks:
#    1. ⏳ [3] Fix login bug
#    2. ✅ [5] Update documentation
#    3. ⏳ [7] Add new feature
#    4. ✅ [8] Code review
#    5. ⏳ [9] Performance optimization

# Add a new todo
mcp-todo add-todo "Implement user authentication" 2
# Output:
# ✅ Todo added successfully!
# 📝 Task: Implement user authentication
# 🎯 Priority: 2
```

## Integration with Cursor IDE

### Option 1: Terminal Command
Open Cursor IDE terminal and run:
```bash
mcp-todo set-workspace
```

### Option 2: Keyboard Shortcut
Create a keyboard shortcut in Cursor IDE to run this command.

### Option 3: Task Runner
Add this as a task in Cursor IDE's task runner.

### Option 4: NPM Script
If you have the task-management project, you can use:
```bash
npm run set-workspace
npm run list-todos
```

## Verification

After running `mcp-todo set-workspace`, you can verify the project context by:

1. Opening http://localhost:3300 in your browser
2. The "Active Project" should show your current Cursor IDE workspace
3. The project path should match your current directory

## Troubleshooting

### MCP Server Not Running
Make sure the MCP Todo Server is running on port 3300:
```bash
curl http://localhost:3300/health
```

### Command Not Found
Make sure the client is installed and in your PATH:
```bash
which mcp-todo
# Should show: /usr/local/bin/mcp-todo or ~/.local/bin/mcp-todo
```

### Permission Denied
Make sure the client is executable:
```bash
chmod +x /usr/local/bin/mcp-todo
```

### Wrong Project Detected
The client uses the current working directory. Make sure you're in the correct Cursor IDE workspace directory when running the command.

## Technical Details

### MCP Tools Used
- `project_set`: Sets the active project context
- `todo_list`: Lists todos for the current project
- `todo_add`: Adds new todos to the current project

### API Endpoints
- `POST /api/project`: Set project context
- `GET /api/todos`: List todos
- `POST /api/todos`: Add new todo

### Project Detection
1. Uses `process.cwd()` to get current directory
2. Tries to read `package.json` for project name
3. Falls back to directory name if no `package.json`

## Benefits

✅ **Portable**: Works from any directory  
✅ **No Hardcoded Paths**: Uses current working directory  
✅ **Uses Existing MCP Tools**: Leverages built-in server functionality  
✅ **Easy Installation**: Simple setup for any user  
✅ **Cross-Platform**: Works on macOS, Linux, and Windows  
✅ **No Server Restart**: Updates project context without restarting server  

## Future Improvements

- Automatic detection when Cursor IDE workspace changes
- Real-time project switching
- Integration with Cursor IDE's built-in project detection
- GUI interface for easier interaction

