#!/bin/bash

echo "🚀 MCP Todo Server - Installation Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first:"
    echo "   https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

# Make CLI executable
chmod +x bin/mcp-todo-server.js

echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "Next steps:"
echo "1. 🚀 Start the server: npm start"
echo "2. 🌐 Open web UI: http://localhost:3000"
echo "3. 🔧 Install Cursor config: npm run install-cursor"
echo "4. 🔄 Restart Cursor IDE"
echo ""
echo "Available commands:"
echo "  npm start              # Start HTTP server"
echo "  npm run mcp            # Start MCP server"
echo "  npm run install-cursor # Install Cursor config"
echo "  npm run dev            # Development mode"
echo ""
echo "📚 For more help: ./bin/mcp-todo-server.js --help"
