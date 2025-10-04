#!/bin/bash

# MCP Todo Server - Setup Script
# This script sets up the MCP Todo Server for easy installation

echo "🚀 MCP Todo Server - Setup"
echo "=========================="
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

# Install Cursor configuration
echo "🔧 Installing Cursor IDE configuration..."
npm run install-cursor

# Make scripts executable
chmod +x setup.sh
chmod +x install.sh

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ MCP Todo Server is ready to use!"
echo ""
echo "📋 What was installed:"
echo "   • MCP Todo Server with SQLite storage"
echo "   • Cursor IDE integration"
echo "   • Web UI interface"
echo "   • All necessary dependencies"
echo ""
echo "🚀 How to start:"
echo "   npm start                    # Start the server"
echo "   npm run dev                  # Development mode"
echo "   npm run install-cursor       # Reinstall Cursor config"
echo ""
echo "🌐 Access points:"
echo "   • Web UI: http://localhost:3300"
echo "   • Health: http://localhost:3300/health"
echo "   • API: http://localhost:3300/api"
echo ""
echo "💬 Use in Cursor IDE:"
echo "   • todo_add('Task name', priority?, tags?)"
echo "   • todo_list('pending' | 'completed' | 'all')"
echo "   • todo_mark_done('task-id')"
echo "   • todo_remove('task-id')"
echo "   • todo_clear()"
echo "   • project_set('/path/to/project', 'Project Name')"
echo ""
echo "📚 Documentation:"
echo "   • README.md - Complete setup guide"
echo "   • docs/ - Detailed documentation"
echo ""
echo "🔄 For updates:"
echo "   1. git pull"
echo "   2. ./setup.sh"
echo "   3. Restart Cursor IDE"
echo "   4. npm start"
echo ""
echo "✨ Ready to manage tasks across all projects!"
