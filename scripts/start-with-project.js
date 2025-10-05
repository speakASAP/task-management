#!/usr/bin/env node

/**
 * Start MCP Todo Server with Current Project Context
 * 
 * This script starts the MCP Todo Server and automatically sets the current
 * working directory as the project context.
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the current working directory
const currentProject = process.cwd();
const projectName = currentProject.split('/').pop() || 'Unknown Project';

console.log(`🚀 Starting MCP Todo Server with project context:`);
console.log(`📁 Project: ${projectName}`);
console.log(`📍 Path: ${currentProject}`);

// Set environment variables for the MCP server
process.env.CURSOR_WORKSPACE = currentProject;
process.env.WORKSPACE_PATH = currentProject;
process.env.PROJECT_PATH = currentProject;

// Start the MCP server
const serverPath = join(__dirname, '..', 'dist', 'todo-server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    CURSOR_WORKSPACE: currentProject,
    WORKSPACE_PATH: currentProject,
    PROJECT_PATH: currentProject
  }
});

// Handle server events
server.on('error', (error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`MCP server exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP server...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down MCP server...');
  server.kill('SIGTERM');
});

