#!/usr/bin/env node
/**
 * Cursor Installation Script
 * 
 * This script helps users install the MCP Todo Server in Cursor IDE
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const cursorConfigPath = path.join(os.homedir(), '.cursor', 'mcp.json');
const cursorDir = path.dirname(cursorConfigPath);

console.log('🚀 MCP Todo Server - Cursor Installation');
console.log('==========================================\n');

// Check if Cursor is installed
try {
  execSync('cursor --version', { stdio: 'pipe' });
  console.log('✅ Cursor IDE detected');
} catch (error) {
  console.log('❌ Cursor IDE not found. Please install Cursor first:');
  console.log('   https://cursor.sh/');
  process.exit(1);
}

// Ensure .cursor directory exists
if (!fs.existsSync(cursorDir)) {
  fs.mkdirSync(cursorDir, { recursive: true });
  console.log('📁 Created .cursor directory');
}

// Read existing config or create new one
let config = {};
if (fs.existsSync(cursorConfigPath)) {
  try {
    config = JSON.parse(fs.readFileSync(cursorConfigPath, 'utf8'));
    console.log('📖 Found existing Cursor configuration');
  } catch (error) {
    console.log('⚠️  Could not parse existing config, creating new one');
    config = {};
  }
} else {
  console.log('📝 Creating new Cursor configuration');
}

// Add MCP Todo Server configuration
config.mcpServers = config.mcpServers || {};

// Check if already configured
if (config.mcpServers['mcp-todo-server']) {
  console.log('⚠️  MCP Todo Server already configured');
  console.log('🔄 Updating configuration...');
}

// Get the current working directory (where the server is installed)
const serverPath = process.cwd();
const serverExecutable = path.join(serverPath, 'dist', 'unified-server.js');

// Check if server is built
if (!fs.existsSync(serverExecutable)) {
  console.log('🔨 Building server...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: serverPath });
    console.log('✅ Server built successfully');
  } catch (error) {
    console.error('❌ Failed to build server:', error.message);
    process.exit(1);
  }
}

// Configure the server
config.mcpServers['mcp-todo-server'] = {
  command: 'node',
  args: [serverExecutable, '--stdio'],
  cwd: serverPath,
  env: {
    NODE_ENV: 'production'
  }
};

// Write updated config
fs.writeFileSync(cursorConfigPath, JSON.stringify(config, null, 2));

console.log('✅ Cursor configuration installed successfully!');
console.log('📁 Config file:', cursorConfigPath);
console.log('');

// Show next steps
console.log('🎉 Installation Complete!');
console.log('========================');
console.log('');
console.log('Next steps:');
console.log('1. 🔄 Restart Cursor IDE');
console.log('2. 🚀 Start the server: npm start');
console.log('3. 🌐 Open web UI: http://localhost:3000');
console.log('4. 💬 Use in Cursor chat:');
console.log('');
console.log('   Available commands:');
console.log('   • todo_add("Task name", priority?, tags?)');
console.log('   • todo_list("pending" | "completed" | "all")');
console.log('   • todo_mark_done("task-id")');
console.log('   • todo_remove("task-id")');
console.log('   • todo_clear()');
console.log('   • project_set("/path/to/project", "Project Name")');
console.log('');
console.log('📚 For more help: mcp-todo-server --help');
console.log('🐛 Report issues: https://github.com/your-username/mcp-todo-server/issues');
