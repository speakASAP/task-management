# Cursor IDE Integration for MCP Todo Server

This document explains how to integrate the MCP Todo Server with Cursor IDE to automatically detect and switch to the current workspace project.

## Problem

The MCP Todo Server runs 24/7 but doesn't automatically detect which Cursor IDE workspace is currently active. You need a way to tell the server which project you're working on.

## Solution

We've created several tools that can detect the current Cursor IDE workspace and automatically update the MCP Todo Server project context.

## Available Tools

### 1. Quick Command (Recommended)

Run this command from any Cursor IDE workspace:

```bash
/Users/sergiystashok/Documents/GitHub/task-management/scripts/update-mcp-project
```

This will:
- Detect the current workspace directory
- Extract the project name
- Update the MCP Todo Server project context
- Show confirmation

### 2. Node.js Script

```bash
cd /path/to/your/cursor/workspace
node /Users/sergiystashok/Documents/GitHub/task-management/scripts/cursor-workspace-detector.js
```

### 3. Shell Script

```bash
/Users/sergiystashok/Documents/GitHub/task-management/scripts/detect-workspace.sh
```

### 4. NPM Script

From the task-management directory:

```bash
npm run detect-workspace
```

## How It Works

1. **Detection**: The tools detect the current working directory (which is the Cursor IDE workspace)
2. **Project Name**: Extract project name from `package.json` or use directory name
3. **API Call**: Send a POST request to `http://localhost:3300/api/project`
4. **Update**: The MCP Todo Server updates its active project context
5. **Confirmation**: Show success message with project details

## Integration with Cursor IDE

### Option 1: Terminal Command
Open Cursor IDE terminal and run:
```bash
/Users/sergiystashok/Documents/GitHub/task-management/scripts/update-mcp-project
```

### Option 2: Keyboard Shortcut
You can create a keyboard shortcut in Cursor IDE to run this command.

### Option 3: Task Runner
Add this as a task in Cursor IDE's task runner.

## Verification

After running any of the tools, you can verify the project context by:

1. Opening http://localhost:3300 in your browser
2. The "Active Project" should show your current Cursor IDE workspace
3. The project path should match your current directory

## Example Usage

```bash
# You're working in /Users/sergiystashok/Documents/GitHub/Tresinky_web
cd /Users/sergiystashok/Documents/GitHub/Tresinky_web

# Update MCP Todo Server to this project
/Users/sergiystashok/Documents/GitHub/task-management/scripts/update-mcp-project

# Output:
# 🔍 Cursor IDE Workspace Detected:
# 📁 Path: /Users/sergiystashok/Documents/GitHub/Tresinky_web
# 📝 Name: Tresinky_web
# 🔄 Updating MCP Todo Server...
# ✅ MCP Todo Server updated successfully!
# 🎉 Active Project: Tresinky_web
# 📍 Path: /Users/sergiystashok/Documents/GitHub/Tresinky_web
# 
# 🌐 View your tasks at: http://localhost:3300
```

## Troubleshooting

### MCP Server Not Running
Make sure the MCP Todo Server is running on port 3300:
```bash
# Check if server is running
curl http://localhost:3300/health
```

### Permission Denied
Make sure the scripts are executable:
```bash
chmod +x /Users/sergiystashok/Documents/GitHub/task-management/scripts/update-mcp-project
```

### Wrong Project Detected
The tools use the current working directory. Make sure you're in the correct Cursor IDE workspace directory when running the command.

## Future Improvements

- Automatic detection when Cursor IDE workspace changes
- MCP tool integration for seamless detection
- Real-time project switching
- Integration with Cursor IDE's built-in project detection

