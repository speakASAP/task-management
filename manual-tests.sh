#!/bin/bash

# Manual MCP Todo Server Test Commands
echo "🔧 Manual Test Commands for MCP Todo Server"
echo "==========================================="
echo ""

echo "1. Health Check:"
echo "curl http://localhost:3000/health"
echo ""

echo "2. Server Info:"
echo "curl http://localhost:3000/"
echo ""

echo "3. Add a Todo:"
echo 'curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '"'"'{"method": "tools/call", "params": {"name": "todo_add", "arguments": {"name": "Test todo item"}}}'"'"''
echo ""

echo "4. List All Todos:"
echo 'curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '"'"'{"method": "tools/call", "params": {"name": "todo_list", "arguments": {}}}'"'"''
echo ""

echo "5. List Pending Todos:"
echo 'curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '"'"'{"method": "tools/call", "params": {"name": "todo_list", "arguments": {"status": "pending"}}}'"'"''
echo ""

echo "6. Mark Todo as Done (replace TODO_ID with actual ID):"
echo 'curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '"'"'{"method": "tools/call", "params": {"name": "todo_mark_done", "arguments": {"id": "TODO_ID"}}}'"'"''
echo ""

echo "7. Remove Todo (replace TODO_ID with actual ID):"
echo 'curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '"'"'{"method": "tools/call", "params": {"name": "todo_remove", "arguments": {"id": "TODO_ID"}}}'"'"''
echo ""

echo "8. Analyze Todos:"
echo 'curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '"'"'{"method": "tools/call", "params": {"name": "todo_analyze", "arguments": {}}}'"'"''
echo ""

echo "9. Clear All Todos:"
echo 'curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '"'"'{"method": "tools/call", "params": {"name": "todo_clear", "arguments": {}}}'"'"''
echo ""

echo "📝 Instructions:"
echo "1. Start the server: npm run dev"
echo "2. Run the automated test: ./test-server.sh"
echo "3. Or copy/paste individual commands above"
echo "4. Check server logs for detailed information"
