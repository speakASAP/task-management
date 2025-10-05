#!/usr/bin/env node

/**
 * Install Universal MCP Client
 * 
 * This script installs the universal MCP client to a location where it can be
 * easily accessed from any Cursor IDE workspace.
 */

import { copyFileSync, chmodSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Install universal client to user's local bin
 */
function installUniversalClient() {
  try {
    // Get user's home directory
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error('Could not determine home directory');
    }

    // Create local bin directory if it doesn't exist
    const localBinDir = join(homeDir, '.local', 'bin');
    if (!existsSync(localBinDir)) {
      mkdirSync(localBinDir, { recursive: true });
      console.log(`📁 Created directory: ${localBinDir}`);
    }

    // Copy the universal client
    const sourceFile = join(__dirname, 'universal-mcp-client.js');
    const targetFile = join(localBinDir, 'mcp-todo');
    
    copyFileSync(sourceFile, targetFile);
    chmodSync(targetFile, '755');
    
    console.log(`✅ Universal MCP client installed to: ${targetFile}`);
    console.log(`\n🚀 You can now use it from any directory:`);
    console.log(`   mcp-todo set-workspace`);
    console.log(`   mcp-todo list-todos`);
    console.log(`   mcp-todo add-todo "Task Name"`);
    
    // Check if local bin is in PATH
    const pathEnv = process.env.PATH || '';
    if (!pathEnv.includes(localBinDir)) {
      console.log(`\n⚠️  Note: You may need to add ${localBinDir} to your PATH`);
      console.log(`   Add this to your ~/.bashrc or ~/.zshrc:`);
      console.log(`   export PATH="$HOME/.local/bin:$PATH"`);
    } else {
      console.log(`\n✅ ${localBinDir} is already in your PATH`);
    }
    
  } catch (error) {
    console.error(`❌ Installation failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Create a symlink in /usr/local/bin (requires sudo)
 */
function installSystemWide() {
  try {
    const sourceFile = join(__dirname, 'universal-mcp-client.js');
    const targetFile = '/usr/local/bin/mcp-todo';
    
    execSync(`sudo cp "${sourceFile}" "${targetFile}"`, { stdio: 'inherit' });
    execSync(`sudo chmod +x "${targetFile}"`, { stdio: 'inherit' });
    
    console.log(`✅ Universal MCP client installed system-wide to: ${targetFile}`);
    console.log(`\n🚀 You can now use it from any directory:`);
    console.log(`   mcp-todo set-workspace`);
    console.log(`   mcp-todo list-todos`);
    console.log(`   mcp-todo add-todo "Task Name"`);
    
  } catch (error) {
    console.error(`❌ System-wide installation failed: ${error.message}`);
    console.log(`\n💡 Try the local installation instead:`);
    installUniversalClient();
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`🚀 Universal MCP Client Installer`);
  console.log(`\nThis script installs the universal MCP client for easy access from any Cursor IDE workspace.`);
  console.log(`\nUsage:`);
  console.log(`  node install-universal-client.js [option]`);
  console.log(`\nOptions:`);
  console.log(`  local       Install to ~/.local/bin (recommended)`);
  console.log(`  system      Install to /usr/local/bin (requires sudo)`);
  console.log(`  help        Show this help message`);
  console.log(`\nExamples:`);
  console.log(`  node install-universal-client.js local`);
  console.log(`  node install-universal-client.js system`);
}

/**
 * Main function
 */
function main() {
  const option = process.argv[2] || 'local';
  
  switch (option) {
    case 'local':
      installUniversalClient();
      break;
    case 'system':
      installSystemWide();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      console.error(`❌ Unknown option: ${option}`);
      showHelp();
      process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { installUniversalClient, installSystemWide };

