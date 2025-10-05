#!/usr/bin/env node

/**
 * Cursor IDE Workspace Detector
 * 
 * This script can be called from Cursor IDE to automatically detect
 * the current workspace and update the MCP Todo Server project context.
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
 * Update MCP Todo Server project context
 */
async function updateProjectContext(projectPath, projectName) {
  try {
    const apiUrl = 'http://localhost:3300/api/project';
    const projectData = {
      path: projectPath,
      name: projectName
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ MCP Todo Server updated to project: ${result.data?.name || projectName}`);
      console.log(`📍 Path: ${result.data?.path || projectPath}`);
      return true;
    } else {
      console.error(`❌ Failed to update MCP server: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating MCP server: ${error.message}`);
    return false;
  }
}

/**
 * Main function - can be called from Cursor IDE
 */
async function main() {
  // Get the current working directory (Cursor IDE workspace)
  const projectPath = process.cwd();
  const projectName = detectProjectName(projectPath);
  
  console.log(`🔍 Cursor IDE Workspace Detected:`);
  console.log(`📁 Path: ${projectPath}`);
  console.log(`📝 Name: ${projectName}`);
  
  // Update the MCP Todo Server
  const success = await updateProjectContext(projectPath, projectName);
  
  if (success) {
    console.log(`\n🎉 MCP Todo Server project context updated!`);
    console.log(`🌐 View tasks at: http://localhost:3300`);
  } else {
    console.log(`\n❌ Failed to update MCP Todo Server`);
    process.exit(1);
  }
}

// Export for use as a module
export { detectProjectName, updateProjectContext };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

