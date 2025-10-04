#!/usr/bin/env node
/**
 * Unified MCP Todo Server
 * 
 * Features:
 * - MCP protocol support for Cursor IDE
 * - HTTP API for web interface
 * - SQLite storage (no external dependencies)
 * - Session management for different projects
 * - Auto-setup and configuration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore - better-sqlite3 types
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Todo {
  id: string;
  name: string;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  priority?: number;
  tags?: string[];
}

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

class UnifiedMCPServer {
  private mcpServer!: Server;
  private httpApp!: express.Application;
  private db: Database.Database;
  private currentProjectId: string | null = null;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.initializeDatabase();
    this.setupMCPServer();
    this.setupHTTPServer();
  }

  private initializeDatabase(): void {
    const dbPath = path.join(process.cwd(), 'mcp-todo.db');
    this.db = new Database(dbPath);
    
    // Create tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        projectId TEXT,
        priority INTEGER DEFAULT 5,
        tags TEXT,
        FOREIGN KEY (projectId) REFERENCES projects (id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(projectId);
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
    `);
  }

  private setupMCPServer(): void {
    this.mcpServer = new Server(
      {
        name: 'mcp-todo-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Handle MCP tool listing
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'todo_add',
            description: 'Add a new todo item',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Name of the todo item' },
                priority: { type: 'number', description: 'Priority level (1-10)', minimum: 1, maximum: 10 },
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the todo' }
              },
              required: ['name']
            }
          },
          {
            name: 'todo_list',
            description: 'List all todos for current project',
            inputSchema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['pending', 'completed', 'all'], description: 'Filter by status' }
              }
            }
          },
          {
            name: 'todo_mark_done',
            description: 'Mark a todo as completed',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID of the todo to mark as done' }
              },
              required: ['id']
            }
          },
          {
            name: 'todo_remove',
            description: 'Remove a todo by ID',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'ID of the todo to remove' }
              },
              required: ['id']
            }
          },
          {
            name: 'todo_clear',
            description: 'Clear all todos for current project',
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
                path: { type: 'string', description: 'Project path' },
                name: { type: 'string', description: 'Project name' }
              },
              required: ['path']
            }
          }
        ]
      };
    });

    // Handle MCP tool calls
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        let result: any;
        
        switch (name) {
          case 'todo_add':
            result = await this.addTodo(args?.name as string, args?.priority as number, args?.tags as string[]);
            break;
          case 'todo_list':
            result = await this.listTodos(args?.status as string);
            break;
          case 'todo_mark_done':
            result = await this.markTodoDone(args?.id as string);
            break;
          case 'todo_remove':
            result = await this.removeTodo(args?.id as string);
            break;
          case 'todo_clear':
            result = await this.clearTodos();
            break;
          case 'project_set':
            result = await this.setProject(args?.path as string, args?.name as string);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          ]
        };
      }
    });
  }

  private setupHTTPServer(): void {
    this.httpApp = express();
    this.httpApp.use(cors());
    this.httpApp.use(express.json());

    // Health check
    this.httpApp.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        projectId: this.currentProjectId,
        totalTodos: this.getTotalTodos()
      });
    });

    // API endpoints
    this.httpApp.get('/api/todos', async (req, res) => {
      try {
        const status = req.query.status as string || 'all';
        const result = await this.listTodos(status);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch todos' });
      }
    });

    this.httpApp.post('/api/todos', async (req, res) => {
      try {
        const { name, priority, tags } = req.body;
        const result = await this.addTodo(name, priority, tags);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to add todo' });
      }
    });

    this.httpApp.put('/api/todos/:id/done', async (req, res) => {
      try {
        const result = await this.markTodoDone(req.params.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to mark todo as done' });
      }
    });

    this.httpApp.delete('/api/todos/:id', async (req, res) => {
      try {
        const result = await this.removeTodo(req.params.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to remove todo' });
      }
    });

    this.httpApp.delete('/api/todos', async (_req, res) => {
      try {
        const result = await this.clearTodos();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to clear todos' });
      }
    });

    // Serve web UI
    this.httpApp.use(express.static(path.join(__dirname, 'web-ui')));
    this.httpApp.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'web-ui', 'index.html'));
    });
  }

  // Database operations
  private async addTodo(name: string, priority: number = 5, tags: string[] = []): Promise<any> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO todos (id, name, status, createdAt, updatedAt, projectId, priority, tags)
      VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, now, now, this.currentProjectId, priority, JSON.stringify(tags));
    
    return {
      success: true,
      data: { id, name, status: 'pending', createdAt: now, updatedAt: now, priority, tags },
      message: 'Todo added successfully'
    };
  }

  private async listTodos(status: string = 'all'): Promise<any> {
    let query = 'SELECT * FROM todos WHERE projectId = ?';
    const params: any[] = [this.currentProjectId];
    
    if (status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY priority DESC, createdAt DESC';
    
    const stmt = this.db.prepare(query);
    const todos = stmt.all(...params);
    
    const processedTodos = todos.map((todo: any) => ({
      ...todo,
      tags: todo.tags ? JSON.parse(todo.tags) : []
    }));
    
    return {
      success: true,
      data: {
        todos: processedTodos,
        total: processedTodos.length,
        pending: processedTodos.filter((t: any) => t.status === 'pending').length,
        completed: processedTodos.filter((t: any) => t.status === 'completed').length
      },
      message: `Found ${processedTodos.length} todos`
    };
  }

  private async markTodoDone(id: string): Promise<any> {
    const stmt = this.db.prepare('UPDATE todos SET status = ?, updatedAt = ? WHERE id = ? AND projectId = ?');
    const result = stmt.run('completed', new Date().toISOString(), id, this.currentProjectId);
    
    if (result.changes === 0) {
      return { success: false, error: 'Todo not found' };
    }
    
    return { success: true, message: 'Todo marked as completed' };
  }

  private async removeTodo(id: string): Promise<any> {
    const stmt = this.db.prepare('DELETE FROM todos WHERE id = ? AND projectId = ?');
    const result = stmt.run(id, this.currentProjectId);
    
    if (result.changes === 0) {
      return { success: false, error: 'Todo not found' };
    }
    
    return { success: true, message: 'Todo removed successfully' };
  }

  private async clearTodos(): Promise<any> {
    const stmt = this.db.prepare('DELETE FROM todos WHERE projectId = ?');
    const result = stmt.run(this.currentProjectId);
    
    return { success: true, message: `Cleared ${result.changes} todos` };
  }

  private async setProject(path: string, name?: string): Promise<any> {
    // Check if project exists
    let stmt = this.db.prepare('SELECT * FROM projects WHERE path = ?');
    let project = stmt.get(path);
    
    if (!project) {
      // Create new project
      const projectId = uuidv4();
      const now = new Date().toISOString();
      stmt = this.db.prepare('INSERT INTO projects (id, name, path, createdAt) VALUES (?, ?, ?, ?)');
      stmt.run(projectId, name || path.split('/').pop() || 'Unknown Project', path, now);
      project = { id: projectId, name: name || path.split('/').pop() || 'Unknown Project', path, createdAt: now };
    }
    
    this.currentProjectId = project.id;
    
    return {
      success: true,
      data: project,
      message: `Switched to project: ${project.name}`
    };
  }

  private getTotalTodos(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM todos WHERE projectId = ?');
    const result = stmt.get(this.currentProjectId);
    return result?.count || 0;
  }

  public async start(): Promise<void> {
    // Auto-detect project from current working directory
    const cwd = process.cwd();
    await this.setProject(cwd);
    
    // Start HTTP server
    this.httpApp.listen(this.port, () => {
      console.log(`🚀 MCP Todo Server started`);
      console.log(`📱 Web UI: http://localhost:${this.port}`);
      console.log(`🔧 API: http://localhost:${this.port}/api`);
      console.log(`📋 Health: http://localhost:${this.port}/health`);
      console.log(`📁 Project: ${cwd}`);
    });
  }

  private async handleMCPRequest(request: any): Promise<any> {
    const { method, id, params } = request;
    
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
              name: 'mcp-todo-server',
              version: '1.0.0'
            }
          }
        };

      case 'initialized':
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
                    name: { type: 'string', description: 'Name of the todo item' },
                    priority: { type: 'number', description: 'Priority level (1-10)', minimum: 1, maximum: 10 },
                    tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the todo' }
                  },
                  required: ['name']
                }
              },
              {
                name: 'todo_list',
                description: 'List all todos for current project',
                inputSchema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['pending', 'completed', 'all'], description: 'Filter by status' }
                  }
                }
              },
              {
                name: 'todo_mark_done',
                description: 'Mark a todo as completed',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'ID of the todo to mark as done' }
                  },
                  required: ['id']
                }
              },
              {
                name: 'todo_remove',
                description: 'Remove a todo by ID',
                inputSchema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'ID of the todo to remove' }
                  },
                  required: ['id']
                }
              },
              {
                name: 'todo_clear',
                description: 'Clear all todos for current project',
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
                    path: { type: 'string', description: 'Project path' },
                    name: { type: 'string', description: 'Project name' }
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
      let result: any;
      
      switch (name) {
        case 'todo_add':
          result = await this.addTodo(args?.name as string, args?.priority as number, args?.tags as string[]);
          break;
        case 'todo_list':
          result = await this.listTodos(args?.status as string);
          break;
        case 'todo_mark_done':
          result = await this.markTodoDone(args?.id as string);
          break;
        case 'todo_remove':
          result = await this.removeTodo(args?.id as string);
          break;
        case 'todo_clear':
          result = await this.clearTodos();
          break;
        case 'project_set':
          result = await this.setProject(args?.path as string, args?.name as string);
          break;
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

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public async handleStdio(): Promise<void> {
    // Handle MCP requests via stdio
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
            // Handle MCP request manually since handleRequest doesn't exist
            this.handleMCPRequest(request).then((response: any) => {
              if (response) {
                process.stdout.write(JSON.stringify(response) + '\n');
              }
            });
          } catch (error) {
            console.error('Failed to process MCP request:', error);
          }
        }
      }
    });
  }
}

// CLI handling
if (process.argv.includes('--stdio')) {
  // MCP mode
  const server = new UnifiedMCPServer();
  server.handleStdio();
} else {
  // HTTP mode
  const port = parseInt(process.env.PORT || '3000');
  const server = new UnifiedMCPServer(port);
  server.start();
}

export default UnifiedMCPServer;
