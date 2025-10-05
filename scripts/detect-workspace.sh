#!/bin/bash

# Cursor IDE Workspace Detector
# This script detects the current Cursor IDE workspace and updates the MCP Todo Server

# Get the current directory (which should be the Cursor IDE workspace)
CURRENT_DIR=$(pwd)
PROJECT_NAME=$(basename "$CURRENT_DIR")

echo "🔍 Detected Cursor IDE workspace:"
echo "📁 Path: $CURRENT_DIR"
echo "📝 Name: $PROJECT_NAME"

# Update the MCP Todo Server project context
echo "🔄 Updating MCP Todo Server project context..."

# Use Node.js to make the API call
node -e "
const https = require('https');
const http = require('http');

const projectData = {
  path: '$CURRENT_DIR',
  name: '$PROJECT_NAME'
};

const postData = JSON.stringify(projectData);

const options = {
  hostname: 'localhost',
  port: 3300,
  path: '/api/project',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      const result = JSON.parse(data);
      console.log('✅ MCP Todo Server updated successfully!');
      console.log('🎉 Active Project:', result.data?.name || '$PROJECT_NAME');
      console.log('📍 Path:', result.data?.path || '$CURRENT_DIR');
      console.log('');
      console.log('🌐 View your tasks at: http://localhost:3300');
    } else {
      console.error('❌ Failed to update MCP server:', res.statusCode, res.statusMessage);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error updating MCP server:', error.message);
});

req.write(postData);
req.end();
"

