#!/usr/bin/env node

/**
 * Set Current Project Script
 * 
 * This script automatically sets the current project context for the MCP Todo Server
 * based on the current working directory.
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
 * Set project context via API
 */
async function setProjectContext(projectPath, projectName) {
  try {
    const apiUrl = 'http://localhost:3300/api/project';
    const projectData = {
      path: projectPath,
      name: projectName
    };
    
    console.log(`🔄 Setting project context...`);
    console.log(`📁 Path: ${projectPath}`);
    console.log(`📝 Name: ${projectName}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Project set successfully!`);
      console.log(`🎉 Active Project: ${result.data?.name || projectName}`);
      console.log(`📍 Path: ${result.data?.path || projectPath}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`❌ Failed to set project: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error setting project: ${error.message}`);
    return false;
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxRetries = 30, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3300/health');
      if (response.ok) {
        console.log(`✅ MCP server is ready!`);
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    if (i < maxRetries - 1) {
      console.log(`⏳ Waiting for MCP server... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`❌ MCP server not ready after ${maxRetries} attempts`);
  return false;
}

/**
 * Main function
 */
async function main() {
  const projectPath = process.cwd();
  const projectName = detectProjectName(projectPath);
  
  console.log(`🔍 Detected project:`);
  console.log(`📁 Path: ${projectPath}`);
  console.log(`📝 Name: ${projectName}`);
  
  // Wait for server to be ready
  const serverReady = await waitForServer();
  if (!serverReady) {
    process.exit(1);
  }
  
  // Set the project context
  const success = await setProjectContext(projectPath, projectName);
  
  if (success) {
    console.log(`\n🎉 Project context set successfully!`);
    console.log(`🌐 View your tasks at: http://localhost:3300`);
    console.log(`📋 The web interface should now show the correct project.`);
  } else {
    console.log(`\n❌ Failed to set project context`);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
