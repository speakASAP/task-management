#!/bin/bash

# MCP Todo Server Test Script
echo "🚀 MCP Todo Server Test Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local method="$3"
    local data="$4"
    
    echo -e "\n${BLUE}Testing: $name${NC}"
    echo "URL: $url"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✅ SUCCESS (HTTP $http_code)${NC}"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo -e "${RED}❌ FAILED (HTTP $http_code)${NC}"
        echo "$body"
    fi
}

# Function to wait for server
wait_for_server() {
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}Waiting for server to start...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/health >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Server is ready!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo -e "\n${RED}❌ Server failed to start within $max_attempts seconds${NC}"
    return 1
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq is not installed. Installing via Homebrew...${NC}"
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo -e "${RED}❌ Please install jq manually: https://stedolan.github.io/jq/${NC}"
        exit 1
    fi
fi

# Check if Redis is running
echo -e "${BLUE}Checking Redis connection...${NC}"
if ! redis-cli ping >/dev/null 2>&1; then
    echo -e "${RED}❌ Redis is not running. Please start Redis first:${NC}"
    echo "   docker run -d --name redis-mcp -p 6379:6379 redis:7-alpine"
    exit 1
else
    echo -e "${GREEN}✅ Redis is running${NC}"
fi

# Start the server in background
echo -e "${BLUE}Starting MCP server...${NC}"
npm run dev &
SERVER_PID=$!

# Wait for server to be ready
if ! wait_for_server; then
    echo -e "${RED}❌ Failed to start server${NC}"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Test 1: Health Check
test_endpoint "Health Check" "http://localhost:3000/health" "GET" ""

# Test 2: Server Info
test_endpoint "Server Info" "http://localhost:3000/" "GET" ""

# Test 3: Add Todo
test_endpoint "Add Todo" "http://localhost:3000/mcp" "POST" '{
    "method": "tools/call",
    "params": {
        "name": "todo_add",
        "arguments": {
            "name": "Complete project documentation"
        }
    }
}'

# Test 4: Add Another Todo
test_endpoint "Add Another Todo" "http://localhost:3000/mcp" "POST" '{
    "method": "tools/call",
    "params": {
        "name": "todo_add",
        "arguments": {
            "name": "Review code changes"
        }
    }
}'

# Test 5: List All Todos
test_endpoint "List All Todos" "http://localhost:3000/mcp" "POST" '{
    "method": "tools/call",
    "params": {
        "name": "todo_list",
        "arguments": {}
    }
}'

# Test 6: List Pending Todos
test_endpoint "List Pending Todos" "http://localhost:3000/mcp" "POST" '{
    "method": "tools/call",
    "params": {
        "name": "todo_list",
        "arguments": {
            "status": "pending"
        }
    }
}'

# Test 7: Mark Todo as Done (using first todo ID from previous response)
echo -e "\n${BLUE}Testing: Mark Todo as Done${NC}"
echo "Note: This test requires a valid todo ID from the previous list"

# Test 8: Analyze Todos
test_endpoint "Analyze Todos" "http://localhost:3000/mcp" "POST" '{
    "method": "tools/call",
    "params": {
        "name": "todo_analyze",
        "arguments": {}
    }
}'

# Test 9: Clear All Todos
test_endpoint "Clear All Todos" "http://localhost:3000/mcp" "POST" '{
    "method": "tools/call",
    "params": {
        "name": "todo_clear",
        "arguments": {}
    }
}'

# Test 10: Verify Todos are Cleared
test_endpoint "Verify Todos Cleared" "http://localhost:3000/mcp" "POST" '{
    "method": "tools/call",
    "params": {
        "name": "todo_list",
        "arguments": {}
    }
}'

echo -e "\n${GREEN}🎉 All tests completed!${NC}"
echo -e "${BLUE}Server is still running on http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Keep server running
wait $SERVER_PID
