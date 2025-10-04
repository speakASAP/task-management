#!/usr/bin/env node
/**
 * Standalone Unified MCP Todo Server
 * 
 * No external dependencies - uses file-based storage
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Todo {
  id: string;
  name: string;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
  projectId: string;
  priority: number;
  tags: string[];
}

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

class StandaloneUnifiedMCPServer {
  private dataDir: string;
  private currentProjectId: string = 'default';
  private todos: Map<string, Todo> = new Map();
  private projects: Map<string, Project> = new Map();

  constructor() {
    this.dataDir = join(process.cwd(), '.mcp-todo-data');
    this.ensureDataDir();
    this.loadData();
  }

  private ensureDataDir(): void {
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getDataFile(type: 'todos' | 'projects'): string {
    return join(this.dataDir, `${type}.json`);
  }

  private loadData(): void {
    // Load todos
    const todosFile = this.getDataFile('todos');
    if (existsSync(todosFile)) {
      try {
        const data = JSON.parse(readFileSync(todosFile, 'utf8'));
        this.todos = new Map(Object.entries(data));
      } catch (error) {
        console.error('[ERROR] Failed to load todos:', error);
        this.todos = new Map();
      }
    }

    // Load projects
    const projectsFile = this.getDataFile('projects');
    if (existsSync(projectsFile)) {
      try {
        const data = JSON.parse(readFileSync(projectsFile, 'utf8'));
        this.projects = new Map(Object.entries(data));
      } catch (error) {
        console.error('[ERROR] Failed to load projects:', error);
        this.projects = new Map();
      }
    }
  }

  private saveData(): void {
    try {
      // Save todos
      const todosData = Object.fromEntries(this.todos);
      writeFileSync(this.getDataFile('todos'), JSON.stringify(todosData, null, 2));

      // Save projects
      const projectsData = Object.fromEntries(this.projects);
      writeFileSync(this.getDataFile('projects'), JSON.stringify(projectsData, null, 2));
    } catch (error) {
      console.error('[ERROR] Failed to save data:', error);
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
              name: 'mcp-todo-standalone',
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
          const newTodo: Todo = {
            id: todoId,
            name: todoName,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            priority: args?.priority || 5,
            tags: args?.tags || [],
            projectId: this.currentProjectId
          };
          
          this.todos.set(todoId, newTodo);
          this.saveData();
          
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
          let todos = Array.from(this.todos.values())
            .filter(todo => todo.projectId === this.currentProjectId);
          
          if (statusFilter && statusFilter !== 'all') {
            todos = todos.filter(todo => todo.status === statusFilter);
          }
          
          todos.sort((a, b) => {
            // Sort by priority (desc), then by creation date (desc)
            if (a.priority !== b.priority) {
              return b.priority - a.priority;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          const todoList = todos.map(todo => 
            `- [${todo.status === 'completed' ? '✅' : '⏳'}] ${todo.name} (Priority: ${todo.priority}) (ID: ${todo.id})`
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
          
          if (!this.todos.has(removeId)) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Todo not found'
              }
            };
          }
          
          this.todos.delete(removeId);
          this.saveData();
          
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
          
          const existingTodo = this.todos.get(doneId);
          if (!existingTodo) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Todo not found'
              }
            };
          }
          
          existingTodo.status = 'completed';
          existingTodo.updatedAt = new Date().toISOString();
          this.todos.set(doneId, existingTodo);
          this.saveData();
          
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
          const todosToRemove = Array.from(this.todos.entries())
            .filter(([_, todo]) => todo.projectId === this.currentProjectId);
          
          todosToRemove.forEach(([id, _]) => this.todos.delete(id));
          this.saveData();
          
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `🧹 Cleared ${todosToRemove.length} todos from project: ${this.currentProjectId}`
                }
              ]
            }
          };

        case 'todo_analyze':
          const todosForAnalysis = Array.from(this.todos.values())
            .filter(todo => todo.projectId === this.currentProjectId);
          
          const pendingTodos = todosForAnalysis.filter(todo => todo.status === 'pending');
          const completedTodos = todosForAnalysis.filter(todo => todo.status === 'completed');
          
          const analysis = `📊 Todo Analysis (Project: ${this.currentProjectId}):
• Total todos: ${todosForAnalysis.length}
• Pending: ${pendingTodos.length}
• Completed: ${completedTodos.length}
• Completion rate: ${todosForAnalysis.length > 0 ? Math.round((completedTodos.length / todosForAnalysis.length) * 100) : 0}%

${pendingTodos.length > 0 ? '⏳ Pending tasks by priority:\n' + pendingTodos
  .sort((a, b) => b.priority - a.priority)
  .map(todo => `  - [${todo.priority}] ${todo.name}`).join('\n') : '🎉 No pending tasks!'}`;
          
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
          
          // Create or update project record
          const project: Project = {
            id: projectPath,
            name: projectName || projectPath,
            path: projectPath,
            createdAt: new Date().toISOString()
          };
          this.projects.set(projectPath, project);
          this.saveData();
          
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
    console.error('[DEBUG] Standalone Unified MCP Server starting...');
    console.error('[DEBUG] Standalone Unified MCP Server started');
  }

  public async start(): Promise<void> {
    this.setupStdio();
  }
}

new StandaloneUnifiedMCPServer().start();

