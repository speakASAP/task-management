#!/usr/bin/env node

/**
 * Universal MCP Client for Cursor IDE
 * 
 * This script can be placed anywhere and used to interact with the MCP Todo Server
 * from any Cursor IDE workspace. It automatically detects the current workspace
 * and uses the existing MCP server HTTP API.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect project name from package.json or directory name
 */
function detectProjectName(projectPath) {
  // Try to get name from package.json
  const packageJsonPath = join(projectPath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.name) {
        return packageJson.name;
      }
    } catch (error) {
      // Ignore JSON parse errors
    }
  }
  
  // Fallback to directory name
  return projectPath.split('/').pop() || 'Unknown Project';
}

/**
 * Call MCP Todo Server HTTP API
 */
async function callAPI(endpoint, method = 'GET', data = null) {
  try {
    const url = `http://localhost:3300${endpoint}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : null
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error calling MCP server: ${error.message}`);
    throw error;
  }
}

/**
 * Set current workspace as project
 */
async function setCurrentWorkspace() {
  const projectPath = process.cwd();
  const projectName = detectProjectName(projectPath);
  
  console.log(`🔍 Cursor IDE Workspace Detected:`);
  console.log(`📁 Path: ${projectPath}`);
  console.log(`📝 Name: ${projectName}`);
  
  try {
    console.log(`🔄 Setting project context...`);
    const result = await callAPI('/api/project', 'POST', {
      path: projectPath,
      name: projectName
    });
    
    if (result.success) {
      console.log(`✅ Project set successfully!`);
      console.log(`🎉 Active Project: ${result.data?.name || projectName}`);
      console.log(`📍 Path: ${result.data?.path || projectPath}`);
      console.log(`\n🌐 View your tasks at: http://localhost:3300`);
    } else {
      console.error(`❌ Failed to set project: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * List current todos
 */
async function listTodos() {
  try {
    const result = await callAPI('/api/todos?status=all');
    
    if (result.success) {
      console.log(`📋 Current Todos (${result.data.total} total):`);
      console.log(`   Pending: ${result.data.pending}`);
      console.log(`   Completed: ${result.data.completed}`);
      
      if (result.data.todos.length > 0) {
        console.log(`\n📝 Tasks:`);
        result.data.todos.forEach((todo, index) => {
          const status = todo.status === 'completed' ? '✅' : '⏳';
          const priority = `[${todo.priority}]`;
          console.log(`   ${index + 1}. ${status} ${priority} ${todo.name}`);
        });
      }
    } else {
      console.error(`❌ Failed to list todos: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Add a new todo
 */
async function addTodo(name, priority = 5, tags = []) {
  try {
    const result = await callAPI('/api/todos', 'POST', {
      name,
      priority,
      tags
    });
    
    if (result.success) {
      console.log(`✅ Todo added successfully!`);
      console.log(`📝 Task: ${name}`);
      console.log(`🎯 Priority: ${priority}`);
      if (tags.length > 0) {
        console.log(`🏷️  Tags: ${tags.join(', ')}`);
      }
    } else {
      console.error(`❌ Failed to add todo: ${result.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Show current project status
 */
async function showStatus() {
  try {
    const project = await callAPI('/api/project');
    const todos = await callAPI('/api/todos?status=all');
    
    console.log('📊 MCP Todo Server Status');
    console.log('=========================');
    console.log('');
    console.log('🌐 Web UI: http://localhost:3300');
    console.log('');
    console.log('📁 Active Project:');
    console.log(`   Name: ${project.name || 'None'}`);
    console.log(`   Path: ${project.path || 'None'}`);
    console.log('');
    console.log('📋 Todos:');
    if (todos.todos && todos.todos.length > 0) {
      todos.todos.forEach(todo => {
        const status = todo.completed ? '✅' : '⏳';
        const priority = todo.priority ? ` (P${todo.priority})` : '';
        console.log(`   ${status} ${todo.name}${priority}`);
      });
    } else {
      console.log('   No todos found');
    }
    console.log('');
    console.log('🔄 To switch projects:');
    console.log('   cd /path/to/your/project');
    console.log('   mcp-todo set-workspace');
    console.log('');
  } catch (error) {
    console.error('❌ Error getting status:', error.message);
    console.log('💡 Make sure the MCP Todo Server is running: npm start');
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`🚀 Universal MCP Client for Cursor IDE`);
  console.log(`\nThis tool helps you interact with the MCP Todo Server from any Cursor IDE workspace.`);
  console.log(`\nUsage:`);
  console.log(`  node universal-mcp-client.js [command] [options]`);
  console.log(`\nCommands:`);
  console.log(`  set-workspace              Set current directory as active project`);
  console.log(`  list-todos                List current todos`);
  console.log(`  add-todo "Task Name"      Add a new todo (priority 5)`);
  console.log(`  add-todo "Task Name" 8    Add a new todo with priority (1-10)`);
  console.log(`  status                    Show current project status and todos`);
  console.log(`  help                      Show this help message`);
  console.log(`\nExamples:`);
  console.log(`  node universal-mcp-client.js set-workspace`);
  console.log(`  node universal-mcp-client.js list-todos`);
  console.log(`  node universal-mcp-client.js add-todo "Fix bug in login"`);
  console.log(`  node universal-mcp-client.js add-todo "Critical fix" 1`);
  console.log(`  node universal-mcp-client.js status`);
  console.log(`\nNote: Make sure the MCP Todo Server is running on http://localhost:3300`);
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  
  switch (command) {
    case 'set-workspace':
      await setCurrentWorkspace();
      break;
    case 'list-todos':
      await listTodos();
      break;
    case 'add-todo':
      if (!arg1) {
        console.error(`❌ Please provide a task name`);
        console.log(`Usage: node universal-mcp-client.js add-todo "Task Name" [priority]`);
        process.exit(1);
      }
      const priority = arg2 ? parseInt(arg2) : 5;
      const tags = [];
      await addTodo(arg1, priority, tags);
      break;
    case 'status':
      await showStatus();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (!command) {
        console.log(`🚀 Universal MCP Client for Cursor IDE`);
        console.log(`\nRun 'node universal-mcp-client.js help' for usage information.`);
      } else {
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
      }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { setCurrentWorkspace, listTodos, addTodo };
