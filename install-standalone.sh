#!/bin/bash

# Standalone MCP Todo Server Installation Script
# No external dependencies required!

echo "🚀 Installing Standalone MCP Todo Server"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "   Please install Node.js from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    echo "   Please install npm (comes with Node.js)"
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install uuid

# Build the standalone server
echo "🔨 Building standalone server..."
npx tsc src/standalone-unified-server.ts --outDir dist --target ES2022 --module ESNext --moduleResolution node --allowSyntheticDefaultImports --esModuleInterop

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Standalone server built successfully"

# Create Cursor MCP configuration
CURSOR_CONFIG_DIR="$HOME/.cursor"
CURSOR_MCP_CONFIG="$CURSOR_CONFIG_DIR/mcp.json"

# Ensure .cursor directory exists
mkdir -p "$CURSOR_CONFIG_DIR"

# Get the current directory (where the script is run from)
CURRENT_DIR=$(pwd)

# Create or update mcp.json
if [ -f "$CURSOR_MCP_CONFIG" ]; then
    echo "📝 Updating existing Cursor MCP configuration..."
    # Backup existing config
    cp "$CURSOR_MCP_CONFIG" "$CURSOR_MCP_CONFIG.backup.$(date +%s)"
    echo "   (Backup created: $CURSOR_MCP_CONFIG.backup.$(date +%s))"
else
    echo "📝 Creating new Cursor MCP configuration..."
fi

# Create the MCP configuration
cat > "$CURSOR_MCP_CONFIG" << EOF
{
  "mcpServers": {
    "mcp-todo-standalone": {
      "command": "node",
      "args": ["$CURRENT_DIR/dist/standalone-unified-server.js"],
      "cwd": "$CURRENT_DIR"
    }
  }
}
EOF

echo "✅ Cursor MCP configuration updated"

# Create data directory
mkdir -p .mcp-todo-data
echo "✅ Data directory created"

echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "📋 What was installed:"
echo "   • Standalone MCP Todo Server (no external dependencies)"
echo "   • File-based storage (.mcp-todo-data/)"
echo "   • Cursor IDE integration"
echo ""
echo "🚀 How to use:"
echo "   1. Restart Cursor IDE"
echo "   2. Open Command Palette (Cmd+Shift+P)"
echo "   3. Type: 'MCP: Connect to Server'"
echo "   4. Select: 'mcp-todo-standalone'"
echo ""
echo "📝 Available commands:"
echo "   • todo_add('Task name', priority=5, tags=['urgent'])"
echo "   • todo_list(status='pending')"
echo "   • todo_mark_done('task_id')"
echo "   • todo_remove('task_id')"
echo "   • todo_clear()"
echo "   • todo_analyze()"
echo "   • project_set('/path/to/project', 'Project Name')"
echo ""
echo "💾 Data storage:"
echo "   • Todos: .mcp-todo-data/todos.json"
echo "   • Projects: .mcp-todo-data/projects.json"
echo ""
echo "✨ No Docker, no Redis, no external dependencies!"
echo "   Just start Cursor and the MCP server works immediately!"

