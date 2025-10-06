#!/bin/bash

# MCP Todo Server - Docker Setup Script
# This script installs MCP server to Cursor IDE and starts the server in Docker

echo "🐳 MCP Todo Server - Docker Setup"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if Node.js is installed (needed for Cursor installation)
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    echo "   (Required for Cursor IDE integration)"
    exit 1
fi

echo "✅ Node.js is installed (for Cursor integration)"
echo ""

# Install dependencies for Cursor integration
echo "📦 Installing dependencies for Cursor integration..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Build the project for Cursor integration
echo "🔨 Building project for Cursor integration..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build project"
    exit 1
fi

echo "✅ Project built successfully"
echo ""

# Install MCP server to Cursor IDE
echo "🔧 Installing MCP server to Cursor IDE..."
node scripts/install-cursor.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to install MCP server to Cursor IDE"
    exit 1
fi

echo "✅ MCP server installed to Cursor IDE"
echo ""

# Start Docker container
echo "🐳 Starting MCP Todo Server in Docker container..."
echo "   This will start the server with hot-reload and persistent database"
echo ""

# Use docker-compose if available, otherwise use docker compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

# Start the services
$COMPOSE_CMD up -d --build

if [ $? -ne 0 ]; then
    echo "❌ Failed to start Docker container"
    exit 1
fi

echo "✅ MCP Todo Server started in Docker container"
echo ""

# Wait a moment for the server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
echo "🔍 Checking server health..."
if curl -s http://localhost:3300/health > /dev/null; then
    echo "✅ Server is healthy and running"
else
    echo "⚠️  Server may still be starting up..."
fi

echo ""
echo "🎉 Docker Setup Complete!"
echo "========================"
echo ""
echo "✅ MCP server integrated into Cursor IDE"
echo "✅ MCP server running in Docker container"
echo "✅ Database persisted in Docker volume"
echo ""
echo "🌐 Web UI: http://localhost:3300"
echo "📋 Health Check: http://localhost:3300/health"
echo "🔧 API: http://localhost:3300/api"
echo ""
echo "📝 Next steps:"
echo "1. 🔄 Restart Cursor IDE to load MCP configuration"
echo "2. 💬 Use MCP tools in Cursor chat:"
echo ""
echo "   Available MCP commands:"
echo "   • todo_add(\"Task name\", priority?, tags?)"
echo "   • todo_list(\"pending\" | \"completed\" | \"all\")"
echo "   • todo_mark_done(\"task-id\")"
echo "   • todo_remove(\"task-id\")"
echo "   • todo_clear()"
echo "   • project_set(\"/path/to/project\", \"Project Name\")"
echo ""
echo "🐳 Docker commands:"
echo "   • View logs: $COMPOSE_CMD logs -f"
echo "   • Stop server: $COMPOSE_CMD down"
echo "   • Restart server: $COMPOSE_CMD restart"
echo "   • Clean volumes: $COMPOSE_CMD down -v"
echo ""
echo "📚 For more help: mcp-todo --help"
echo "🐛 Report issues: https://github.com/speakASAP/task-management/issues"