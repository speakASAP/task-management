#!/usr/bin/env node
/**
 * Simple Unified MCP Todo Server
 * 
 * A simplified version that works with the existing setup
 */

import { createClient } from 'redis';

class SimpleUnifiedMCPServer {
  private redis: any = null;
  private isConnected = false;
  private currentProjectId: string = 'default';

  private async connectRedis(): Promise<void> {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redis.on('error', (err: any) => {
        console.error('[ERROR] Redis Client Error:', err);
        this.isConnected = false;
      });

      this.redis.on('connect', () => {
        console.error('[DEBUG] Redis connected');
        this.isConnected = true;
      });

      await this.redis.connect();
    } catch (error) {
      console.error('[ERROR] Redis connection failed:', error instanceof Error ? error.message : String(error));
      this.isConnected = false;
    }
  }

  private async handleRequest(request: any): Promise<any> {
    const { method, id, params } = request;
    
    console.error(`[DEBUG] Received: ${method} (id: ${id})`);

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: false
              }
            },
            serverInfo: {
              name: 'mcp-todo-unified',
              version: '1.0.0'
            }
          }
        };

      case 'initialized':
        console.error('[DEBUG] initialized notification received');
        return;

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: [
              {
                name: 'todo_add',
                description: 'Add a new todo item',
                inputSchema: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Name of the todo item'
                    },
                    priority: {
                      type: 'number',
                      description: 'Priority level (1-10)',
                      minimum: 1,
                      maximum: 10
                    },
                    tags: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Tags for the todo'
                    }
                  },
                  required: ['name']
                }
              },
              {
                name: 'todo_list',
                description: 'List all todos (optionally filter by status)',
                inputSchema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      description: 'Filter by status (pending, completed)',
                      enum: ['pending', 'completed', 'all']
                    }
                  }
                }
              },
              {
                name: 'todo_remove',
                description: 'Remove a todo by ID',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID of the todo to remove'
                    }
                  },
                  required: ['id']
                }
              },
              {
                name: 'todo_mark_done',
                description: 'Mark a todo as completed',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      description: 'ID of the todo to mark as done'
                    }
                  },
                  required: ['id']
                }
              },
              {
                name: 'todo_clear',
                description: 'Clear all todos',
                inputSchema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'todo_analyze',
                description: 'AI-powered task analysis and prioritization',
                inputSchema: {
                  type: 'object',
                  properties: {}
                }
              },
              {
                name: 'project_set',
                description: 'Set current project context',
                inputSchema: {
                  type: 'object',
                  properties: {
                    path: {
                      type: 'string',
                      description: 'Project path'
                    },
                    name: {
                      type: 'string',
                      description: 'Project name'
                    }
                  },
                  required: ['path']
                }
              }
            ]
          }
        };

      case 'tools/call':
        return await this.handleToolCall(params, id);

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found'
          }
        };
    }
  }

  private async handleToolCall(params: any, id: any): Promise<any> {
    const { name, arguments: args } = params || {};
    
    if (!this.isConnected) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Redis not connected'
        }
      };
    }

    try {
      switch (name) {
        case 'todo_add':
          const todoName = args?.name;
          if (!todoName) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Missing required parameter: name'
              }
            };
          }
          
          const todoId = `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newTodo = {
            id: todoId,
            name: todoName,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            priority: args?.priority || 5,
            tags: args?.tags || [],
            projectId: this.currentProjectId
          };
          
          await this.redis.hSet('todos', todoId, JSON.stringify(newTodo));
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `✅ Added todo: "${todoName}" (ID: ${todoId})`
                }
              ]
            }
          };

        case 'todo_list':
          const statusFilter = args?.status;
          const allTodos = await this.redis.hGetAll('todos');
          let todos = Object.values(allTodos).map((todoStr: any) => JSON.parse(todoStr as string));
          
          // Filter by project
          todos = todos.filter((todo: any) => todo.projectId === this.currentProjectId);
          
          if (statusFilter && statusFilter !== 'all') {
            todos = todos.filter((todo: any) => todo.status === statusFilter);
          }
          
          todos.sort((a: any, b: any) => {
            // Sort by priority (desc), then by creation date (desc)
            if (a.priority !== b.priority) {
              return (b.priority || 5) - (a.priority || 5);
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          const todoList = todos.map((todo: any) => 
            `- [${todo.status === 'completed' ? '✅' : '⏳'}] ${todo.name} (Priority: ${todo.priority || 5}) (ID: ${todo.id})`
          ).join('\n');
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: todos.length > 0 ? `📋 Todo List (Project: ${this.currentProjectId}):\n${todoList}` : '📋 No todos found'
                }
              ]
            }
          };

        case 'todo_remove':
          const removeId = args?.id;
          if (!removeId) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Missing required parameter: id'
              }
            };
          }
          
          const exists = await this.redis.hExists('todos', removeId);
          if (!exists) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Todo not found'
              }
            };
          }
          
          await this.redis.hDel('todos', removeId);
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `🗑️ Removed todo with ID: ${removeId}`
                }
              ]
            }
          };

        case 'todo_mark_done':
          const doneId = args?.id;
          if (!doneId) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Missing required parameter: id'
              }
            };
          }
          
          const todoStr = await this.redis.hGet('todos', doneId);
          if (!todoStr) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Todo not found'
              }
            };
          }
          
          const existingTodo = JSON.parse(todoStr);
          existingTodo.status = 'completed';
          existingTodo.updatedAt = new Date().toISOString();
          
          await this.redis.hSet('todos', doneId, JSON.stringify(existingTodo));
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `✅ Marked todo as completed: "${existingTodo.name}"`
                }
              ]
            }
          };

        case 'todo_clear':
          const allTodosForClear = await this.redis.hGetAll('todos');
          let clearedCount = 0;
          
          for (const [key, value] of Object.entries(allTodosForClear)) {
            const todo = JSON.parse(value as string);
            if (todo.projectId === this.currentProjectId) {
              await this.redis.hDel('todos', key);
              clearedCount++;
            }
          }
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `🧹 Cleared ${clearedCount} todos from project: ${this.currentProjectId}`
                }
              ]
            }
          };

        case 'todo_analyze':
          const allTodosForAnalysis = await this.redis.hGetAll('todos');
          const todosForAnalysis = Object.values(allTodosForAnalysis)
            .map((todoStr: any) => JSON.parse(todoStr as string))
            .filter((todo: any) => todo.projectId === this.currentProjectId);
          
          const pendingTodos = todosForAnalysis.filter((todo: any) => todo.status === 'pending');
          const completedTodos = todosForAnalysis.filter((todo: any) => todo.status === 'completed');
          
          const analysis = `📊 Todo Analysis (Project: ${this.currentProjectId}):
• Total todos: ${todosForAnalysis.length}
• Pending: ${pendingTodos.length}
• Completed: ${completedTodos.length}
• Completion rate: ${todosForAnalysis.length > 0 ? Math.round((completedTodos.length / todosForAnalysis.length) * 100) : 0}%

${pendingTodos.length > 0 ? '⏳ Pending tasks by priority:\n' + pendingTodos
  .sort((a: any, b: any) => (b.priority || 5) - (a.priority || 5))
  .map((todo: any) => `  - [${todo.priority || 5}] ${todo.name}`).join('\n') : '🎉 No pending tasks!'}`;
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: analysis
                }
              ]
            }
          };

        case 'project_set':
          const projectPath = args?.path;
          const projectName = args?.name;
          
          if (!projectPath) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Missing required parameter: path'
              }
            };
          }
          
          this.currentProjectId = projectPath;
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `📁 Switched to project: ${projectName || projectPath}`
                }
              ]
            }
          };

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Tool not found'
            }
          };
      }
    } catch (error) {
      console.error(`[ERROR] Tool call failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error'
        }
      };
    }
  }

  private setupStdio(): void {
    process.stdin.setEncoding('utf8');
    let buffer = '';
    process.stdin.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            this.handleRequest(request).then(response => {
              if (response) {
                console.error(`[DEBUG] Sending response: ${JSON.stringify(response)}`);
                process.stdout.write(JSON.stringify(response) + '\n');
              }
            });
          } catch (error) {
            console.error(`[ERROR] Failed to process request: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }
    });
    console.error('[DEBUG] Simple Unified MCP Server starting...');
    console.error('[DEBUG] Simple Unified MCP Server started');
  }

  public async start(): Promise<void> {
    this.setupStdio();
    // Connect to Redis in background (non-blocking)
    setImmediate(() => {
      this.connectRedis();
    });
  }
}

new SimpleUnifiedMCPServer().start();

