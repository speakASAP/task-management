#!/usr/bin/env node

// Test script to verify auto-detect functionality
import UnifiedMCPServer from './dist/todo-server.js';

console.log('Testing auto-detect functionality...');

// Create server instance
const server = new UnifiedMCPServer();

// Test the detectCurrentProject method
console.log('Current working directory:', process.cwd());
console.log('Environment variables:');
console.log('CURSOR_PROJECT_PATH:', process.env['CURSOR_PROJECT_PATH']);
console.log('VSCODE_PROJECT_PATH:', process.env['VSCODE_PROJECT_PATH']);
console.log('WORKSPACE_PATH:', process.env['WORKSPACE_PATH']);
console.log('PROJECT_PATH:', process.env['PROJECT_PATH']);

// Test auto-detect
server.autoDetectProject().then(result => {
  console.log('Auto-detect result:', result);
}).catch(error => {
  console.error('Auto-detect error:', error);
});
