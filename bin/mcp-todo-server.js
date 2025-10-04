#!/usr/bin/env node
/**
 * MCP Todo Server CLI
 * 
 * Usage:
 *   mcp-todo-server                    # Start HTTP server
 *   mcp-todo-server --stdio           # Start MCP server for Cursor
 *   mcp-todo-server --install-cursor  # Install Cursor configuration
 *   mcp-todo-server --help            # Show help
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🚀 MCP Todo Server

Usage:
  mcp-todo-server                    # Start HTTP server with web UI
  mcp-todo-server --stdio           # Start MCP server for Cursor IDE
  mcp-todo-server --install-cursor  # Install Cursor configuration
  mcp-todo-server --port 3300       # Start on specific port
  mcp-todo-server --help            # Show this help

Features:
  ✅ MCP protocol support for Cursor IDE
  ✅ Web UI for task management
  ✅ SQLite storage (no external dependencies)
  ✅ Project-based task organization
  ✅ Priority and tagging system
  ✅ Easy installation and setup

Web UI: ${process.env.BASE_URL || 'http://localhost'}:${process.env.SERVER_PORT || '3300'}
API: ${process.env.BASE_URL || 'http://localhost'}:${process.env.SERVER_PORT || '3300'}/api
Health: ${process.env.BASE_URL || 'http://localhost'}:${process.env.SERVER_PORT || '3300'}/health
`);
  process.exit(0);
}

if (args.includes('--install-cursor')) {
  installCursorConfig();
} else if (args.includes('--stdio')) {
  startMCPServer();
} else {
  startHTTPServer();
}

function installCursorConfig() {
  const cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
  const cursorDir = path.dirname(cursorConfigPath);
  
  // Ensure .cursor directory exists
  if (!fs.existsSync(cursorDir)) {
    fs.mkdirSync(cursorDir, { recursive: true });
  }
  
  // Read existing config or create new one
  let config = {};
  if (fs.existsSync(cursorConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(cursorConfigPath, 'utf8'));
    } catch (error) {
      console.warn('Warning: Could not parse existing Cursor config, creating new one');
    }
  }
  
  // Add MCP Todo Server configuration
  config.mcpServers = config.mcpServers || {};
  config.mcpServers['mcp-todo-server'] = {
    command: 'node',
    args: [path.join(__dirname, '..', 'dist', 'todo-server.js'), '--stdio'],
    cwd: process.cwd(),
    env: {
      NODE_ENV: 'production'
    }
  };
  
  // Write updated config
  fs.writeFileSync(cursorConfigPath, JSON.stringify(config, null, 2));
  
  console.log('✅ Cursor configuration installed successfully!');
  console.log('📁 Config file:', cursorConfigPath);
  console.log('🔄 Restart Cursor IDE to use the MCP Todo Server');
  console.log('');
  console.log('Available commands in Cursor:');
  console.log('  - todo_add(name, priority?, tags?)');
  console.log('  - todo_list(status?)');
  console.log('  - todo_mark_done(id)');
  console.log('  - todo_remove(id)');
  console.log('  - todo_clear()');
  console.log('  - project_set(path, name?)');
}

function startMCPServer() {
  const serverPath = path.join(__dirname, '..', 'dist', 'todo-server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Server not built. Run "npm run build" first.');
    process.exit(1);
  }
  
  const child = spawn('node', [serverPath, '--stdio'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start MCP server:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code);
  });
}

function startHTTPServer() {
  const port = getPortFromArgs();
  const serverPath = path.join(__dirname, '..', 'dist', 'todo-server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Server not built. Run "npm run build" first.');
    process.exit(1);
  }
  
  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: port.toString()
    }
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start HTTP server:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    process.exit(code);
  });
}

function getPortFromArgs() {
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    return parseInt(args[portIndex + 1]);
  }
  return parseInt(process.env.SERVER_PORT || process.env.PORT || '3300');
}
