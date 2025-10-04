# Web UI Files

This directory contains the web UI files for the MCP Todo Server.

## Files

- `index.html` - Complete web interface with MCP Tools Panel

## Build Process

These files are automatically copied to `dist/web-ui/` during the build process via the `copy-web-ui` npm script.

## Features

The web UI includes:

- 🛠️ **MCP Tools Panel** (right side)
  - ➕ Add Task
  - 📋 List Tasks
  - ✅ Mark Done
  - 🗑️ Remove Task
  - 🧹 Clear All
  - 🤖 AI Analyze
  - 📁 Set Project

- 🔄 **Refresh Button** (bottom right)
- 📊 **Statistics Dashboard**
- 📁 **Project-based Task Organization**
- 🎨 **Modern, Responsive Design**

## Usage

The web UI is served by the unified server at the root endpoint (`/`) and provides a complete task management interface that works with the MCP server's API endpoints.
