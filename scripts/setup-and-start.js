#!/usr/bin/env node

/**
 * Complete Setup and Start Script
 * 
 * This script performs the complete setup for new users:
 * 1. Installs MCP server into Cursor IDE
 * 2. Installs universal client
 * 3. Starts the HTTP server
 * 4. Provides usage instructions
 */

import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 MCP Todo Server - Complete Setup');
console.log('====================================\n');

async function runSetup() {
  try {
    // Step 1: Install MCP server into Cursor IDE
    console.log('📦 Step 1: Installing MCP server into Cursor IDE...');
    execSync('node scripts/install-cursor.js', { 
      stdio: 'inherit',
      cwd: __dirname + '/..'
    });
    console.log('✅ MCP server installed into Cursor IDE\n');

    // Step 2: Install universal client
    console.log('🔧 Step 2: Installing universal client...');
    execSync('node scripts/install-universal-client.js local', { 
      stdio: 'inherit',
      cwd: __dirname + '/..'
    });
    console.log('✅ Universal client installed\n');

    // Step 3: Start the server in background
    console.log('🚀 Step 3: Starting MCP Todo Server in background...');
    
    // Start the server in detached mode
    const serverProcess = spawn('npm', ['start'], {
      cwd: __dirname + '/..',
      detached: true,
      stdio: 'ignore'
    });
    
    // Unref to allow the parent process to exit
    serverProcess.unref();
    
    // Give the server time to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ MCP Todo Server started in background');
    console.log('📝 Server PID:', serverProcess.pid);
    console.log('');

    // Step 4: Show completion and usage instructions
    console.log('🎉 Setup Complete!');
    console.log('==================');
    console.log('');
    console.log('✅ MCP server integrated into Cursor IDE');
    console.log('✅ Universal client installed');
    console.log('✅ HTTP server running on http://localhost:3300');
    console.log('');
    console.log('🌐 Web UI: http://localhost:3300');
    console.log('💬 MCP commands available in Cursor IDE chat');
    console.log('🖥️  Terminal commands: mcp-todo --help');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Restart Cursor IDE to load MCP configuration');
    console.log('2. Open http://localhost:3300 in your browser');
    console.log('3. Switch to your project: cd /path/to/your/project && mcp-todo set-workspace');
    console.log('4. Use MCP tools in Cursor IDE or web UI to manage tasks');
    console.log('');
    console.log('🔄 To switch projects:');
    console.log('   cd /path/to/other/project');
    console.log('   mcp-todo set-workspace');
    console.log('');
    console.log('🛑 To stop the server:');
    console.log('   pkill -f "node dist/todo-server.js"');
    console.log('');
    console.log('🚀 Server is now running! You can close this terminal.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
runSetup().catch(console.error);
