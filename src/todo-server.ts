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

// Load environment variables
import { config } from 'dotenv';
config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
// @ts-ignore - better-sqlite3 types
import Database from 'better-sqlite3';
import { AnalysisEngine } from './ai/analysis-engine.js';
import { RedisClient } from './redis/client.js';
import { Logger } from './utils/logger.js';
import { ServerConfig, TodoAnalysisResponse, Todo, Project } from './types/index.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Interfaces are used in the class methods below
// Using Todo and Project types from types/index.js

class UnifiedMCPServer {
  private mcpServer!: Server;
  private httpApp!: express.Application;
  private db: Database.Database;
  private currentProjectId: string | null = null;
  private projectContextExplicitlySet: boolean = false;
  private port: number;
  private analysisEngine: AnalysisEngine | null = null;
  private logger: Logger;
  private config: ServerConfig;

  constructor(port?: number) {
    this.port = port || parseInt(process.env['SERVER_PORT'] || process.env['PORT'] || '3300');
    this.config = this.loadConfig();
    this.logger = new Logger(this.config.logLevel);
    this.initializeDatabase();
    this.initializeAI();
    this.setupMCPServer();
    this.setupHTTPServer();
  }

  private loadConfig(): ServerConfig {
    return {
      port: this.port,
      nodeId: process.env['NODE_1_ID'] || process.env['NODE_2_ID'] || process.env['NODE_ID'] || 'todo-server',
      logLevel: (process.env['LOG_LEVEL'] as any) || 'info',
      redisUrl: process.env['REDIS_URL'] || 'redis://localhost:6379',
      openaiApiKey: process.env['OPENAI_API_KEY'] || '',
      openaiBaseUrl: process.env['OPENAI_BASE_URL'] || 'https://api.openai.com/v1',
      openaiModel: process.env['OPENAI_MODEL'] || 'gpt-3.5-turbo',
      aiAnalysisEnabled: process.env['AI_ANALYSIS_ENABLED'] === 'true',
      aiAnalysisCacheTtl: parseInt(process.env['AI_ANALYSIS_CACHE_TTL'] || '300'),
      aiAnalysisBatchSize: parseInt(process.env['AI_ANALYSIS_BATCH_SIZE'] || '10'),
      redisPoolSize: parseInt(process.env['REDIS_POOL_SIZE'] || '10'),
      cacheTtl: parseInt(process.env['CACHE_TTL'] || '600'),
      maxConcurrentRequests: parseInt(process.env['MAX_CONCURRENT_REQUESTS'] || '100')
    };
  }

  private initializeAI(): void {
    try {
      if (this.config.aiAnalysisEnabled && this.config.openaiApiKey) {
        const redisClient = new RedisClient(this.config.redisUrl);
        this.analysisEngine = new AnalysisEngine(redisClient, this.config);
        this.logger.info('AI Analysis Engine initialized successfully');
      } else {
        this.logger.info('AI Analysis Engine disabled - no API key or disabled in config');
      }
    } catch (error) {
      this.logger.warn('Failed to initialize AI Analysis Engine:', error);
    }
  }

  private initializeDatabase(): void {
    // Use user's home directory for database - works from anywhere
    const homeDir = os.homedir();
    const dbDir = path.join(homeDir, '.mcp-todo-server');
    
    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    const dbPath = path.join(dbDir, 'mcp-todo.db');
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
        analysis TEXT,
        detailedInstructions TEXT,
        aiGuidance TEXT,
        FOREIGN KEY (projectId) REFERENCES projects (id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(projectId);
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
    `);
    
    // Add analysis column if it doesn't exist (migration)
    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN analysis TEXT;`);
    } catch (error) {
      // Column already exists, ignore error
    }
    
    // Add detailedInstructions column if it doesn't exist (migration)
    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN detailedInstructions TEXT;`);
    } catch (error) {
      // Column already exists, ignore error
    }
    
    // Add aiGuidance column if it doesn't exist (migration)
    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN aiGuidance TEXT;`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Migration: Make projectId NOT NULL and clean up orphaned todos
    try {
      // First, delete todos without projectId (orphaned todos)
      this.db.exec(`DELETE FROM todos WHERE projectId IS NULL;`);
      
      // Then recreate the table with NOT NULL constraint for projectId
      this.db.exec(`
        CREATE TABLE todos_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          projectId TEXT NOT NULL,
          priority INTEGER DEFAULT 5,
          tags TEXT,
          analysis TEXT,
          detailedInstructions TEXT,
          aiGuidance TEXT,
          FOREIGN KEY (projectId) REFERENCES projects (id)
        );
        
        INSERT INTO todos_new SELECT * FROM todos;
        DROP TABLE todos;
        ALTER TABLE todos_new RENAME TO todos;
        
        CREATE INDEX IF NOT EXISTS idx_todos_project ON todos(projectId);
        CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      `);
    } catch (error) {
      // Migration failed, but continue - the application will handle validation
      console.warn('Database migration warning:', error);
    }
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
                tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the todo' },
                detailedInstructions: { type: 'string', description: 'Detailed instructions and specifications for the task' }
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
          },
          {
            name: 'project_auto_detect',
            description: 'Auto-detect and switch to current IDE project',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'project_detect_cursor',
            description: 'Detect current project from Cursor IDE workspace context',
            inputSchema: {
              type: 'object',
              properties: {
                workspacePath: { type: 'string', description: 'Current workspace path from Cursor IDE' }
              },
              required: ['workspacePath']
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
            result = await this.addTodo(args?.['name'] as string, args?.['priority'] as number, args?.['tags'] as string[], args?.['detailedInstructions'] as string);
            break;
          case 'todo_list':
            result = await this.listTodos(args?.['status'] as string);
            break;
          case 'todo_mark_done':
            result = await this.markTodoDone(args?.['id'] as string);
            break;
          case 'todo_remove':
            result = await this.removeTodo(args?.['id'] as string);
            break;
          case 'todo_clear':
            result = await this.clearTodos();
            break;
          case 'project_set':
            result = await this.setProject(args?.['path'] as string, args?.['name'] as string);
            break;
          case 'project_auto_detect':
            result = await this.autoDetectProject();
            break;
          case 'project_detect_cursor':
            result = await this.detectProjectFromCursor(args?.['workspacePath'] as string);
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
        const status = req.query['status'] as string || 'all';
        const result = await this.listTodos(status);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch todos' });
      }
    });

    this.httpApp.post('/api/todos', async (req, res) => {
      try {
        const { name, priority, tags, detailedInstructions } = req.body;
        const result = await this.addTodo(name, priority, tags, detailedInstructions);
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

    this.httpApp.put('/api/todos/:id', async (req, res) => {
      try {
        const { name, priority, tags, detailedInstructions, status } = req.body;
        const result = await this.updateTodo(req.params.id, { name, priority, tags, detailedInstructions, status });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to update todo' });
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

    // Analyze todos endpoint
    this.httpApp.post('/api/todos/analyze', async (_req, res) => {
      try {
        const result = await this.analyzeTodos();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze todos' });
      }
    });

    // Project endpoints
    this.httpApp.get('/api/project', async (_req, res) => {
      try {
        const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
        const project = stmt.get(this.currentProjectId);
        res.json(project || { name: null, path: null });
      } catch (error) {
        res.status(500).json({ error: 'Failed to get current project' });
      }
    });

    this.httpApp.post('/api/project', async (req, res) => {
      try {
        const { path, name } = req.body;
        const result = await this.setProject(path, name);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to set project' });
      }
    });

    // Auto-detect and switch project via HTTP API
    this.httpApp.post('/api/project/auto', async (_req, res) => {
      try {
        const result = await this.autoDetectProject();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: 'Failed to auto-detect project' });
      }
    });

    // Get all projects
    this.httpApp.get('/api/projects', async (_req, res) => {
      try {
        const stmt = this.db.prepare('SELECT * FROM projects ORDER BY createdAt DESC');
        const projects = stmt.all();
        res.json({ success: true, data: projects, message: 'Projects retrieved successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
      }
    });

    // Serve web UI
    this.httpApp.use(express.static(path.join(__dirname, 'web-ui')));
    this.httpApp.get('/', (_req, res) => {
      res.sendFile(path.join(__dirname, 'web-ui', 'index.html'));
    });
  }

  // Database operations
  private async addTodo(name: string, priority: number = 5, tags: string[] = [], detailedInstructions?: string): Promise<{ success: boolean; data?: Todo; message: string; error?: string }> {
    // Validate mandatory fields
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: 'Todo name is mandatory and cannot be empty',
        message: 'Failed to add todo: name is required'
      };
    }

    // Validate project context
    if (!this.currentProjectId || !this.projectContextExplicitlySet) {
      return {
        success: false,
        error: 'Project context is mandatory. Please explicitly set a project before creating todos using project_set.',
        message: 'Failed to add todo: no explicit project context set'
      };
    }

    // Verify project exists in database
    const projectStmt = this.db.prepare('SELECT id FROM projects WHERE id = ?');
    const project = projectStmt.get(this.currentProjectId);
    
    if (!project) {
      return {
        success: false,
        error: 'Invalid project context. The current project does not exist in the database.',
        message: 'Failed to add todo: invalid project context'
      };
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO todos (id, name, status, createdAt, updatedAt, projectId, priority, tags, detailedInstructions, aiGuidance)
        VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(id, name.trim(), now, now, this.currentProjectId, priority, JSON.stringify(tags), detailedInstructions || null, null);
      
      return {
        success: true,
        data: { 
          id, 
          name: name.trim(), 
          status: 'pending', 
          createdAt: new Date(now), 
          updatedAt: new Date(now), 
          priority, 
          tags,
          detailedInstructions: detailedInstructions || '',
          aiGuidance: ''
        },
        message: 'Todo added successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message: 'Failed to add todo due to database error'
      };
    }
  }

  private async listTodos(status: string = 'all'): Promise<any> {
    let query = 'SELECT * FROM todos';
    const params: any[] = [];
    
    if (status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY priority ASC, createdAt ASC';
    
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
    // Validate project context
    if (!this.currentProjectId || !this.projectContextExplicitlySet) {
      return {
        success: false,
        error: 'Project context is mandatory. Please explicitly set a project before updating todos using project_set.',
        message: 'Failed to mark todo as done: no explicit project context set'
      };
    }

    // Verify project exists in database
    const projectStmt = this.db.prepare('SELECT id FROM projects WHERE id = ?');
    const project = projectStmt.get(this.currentProjectId);
    
    if (!project) {
      return {
        success: false,
        error: 'Invalid project context. The current project does not exist in the database.',
        message: 'Failed to mark todo as done: invalid project context'
      };
    }

    try {
      const stmt = this.db.prepare('UPDATE todos SET status = ?, priority = ?, updatedAt = ? WHERE id = ? AND projectId = ?');
      const result = stmt.run('completed', 10, new Date().toISOString(), id, this.currentProjectId);
      
      if (result.changes === 0) {
        return { 
          success: false, 
          error: 'Todo not found in current project context',
          message: 'Failed to mark todo as done: todo not found in active project'
        };
      }
      
      return { success: true, message: 'Todo marked as completed' };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message: 'Failed to mark todo as done due to database error'
      };
    }
  }

  private async updateTodo(id: string, updates: { name?: string; priority?: number; tags?: string[]; detailedInstructions?: string; status?: string }): Promise<any> {
    // Validate project context
    if (!this.currentProjectId || !this.projectContextExplicitlySet) {
      return {
        success: false,
        error: 'Project context is mandatory. Please explicitly set a project before updating todos using project_set.',
        message: 'Failed to update todo: no explicit project context set'
      };
    }

    // Verify project exists in database
    const projectStmt = this.db.prepare('SELECT id FROM projects WHERE id = ?');
    const project = projectStmt.get(this.currentProjectId);
    
    if (!project) {
      return {
        success: false,
        error: 'Invalid project context. The current project does not exist in the database.',
        message: 'Failed to update todo: invalid project context'
      };
    }

    // Validate name if being updated
    if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
      return {
        success: false,
        error: 'Todo name is mandatory and cannot be empty',
        message: 'Failed to update todo: name cannot be empty'
      };
    }

    const updateFields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name.trim());
    }
    if (updates.priority !== undefined) {
      updateFields.push('priority = ?');
      values.push(updates.priority);
    }
    if (updates.tags !== undefined) {
      updateFields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.detailedInstructions !== undefined) {
      updateFields.push('detailedInstructions = ?');
      values.push(updates.detailedInstructions);
    }
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      values.push(updates.status);
    }
    
    if (updateFields.length === 0) {
      return { success: false, error: 'No fields to update' };
    }
    
    updateFields.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);
    values.push(this.currentProjectId);
    
    try {
      const stmt = this.db.prepare(`UPDATE todos SET ${updateFields.join(', ')} WHERE id = ? AND projectId = ?`);
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        return { 
          success: false, 
          error: 'Todo not found in current project context',
          message: 'Failed to update todo: todo not found in active project'
        };
      }
      
      return { success: true, message: 'Todo updated successfully' };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message: 'Failed to update todo due to database error'
      };
    }
  }

  private async removeTodo(id: string): Promise<any> {
    // Validate project context
    if (!this.currentProjectId || !this.projectContextExplicitlySet) {
      return {
        success: false,
        error: 'Project context is mandatory. Please explicitly set a project before removing todos using project_set.',
        message: 'Failed to remove todo: no explicit project context set'
      };
    }

    // Verify project exists in database
    const projectStmt = this.db.prepare('SELECT id FROM projects WHERE id = ?');
    const project = projectStmt.get(this.currentProjectId);
    
    if (!project) {
      return {
        success: false,
        error: 'Invalid project context. The current project does not exist in the database.',
        message: 'Failed to remove todo: invalid project context'
      };
    }

    try {
      const stmt = this.db.prepare('DELETE FROM todos WHERE id = ? AND projectId = ?');
      const result = stmt.run(id, this.currentProjectId);
      
      if (result.changes === 0) {
        return { 
          success: false, 
          error: 'Todo not found in current project context',
          message: 'Failed to remove todo: todo not found in active project'
        };
      }
      
      return { success: true, message: 'Todo removed successfully' };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message: 'Failed to remove todo due to database error'
      };
    }
  }

  private async clearTodos(): Promise<any> {
    // Validate project context
    if (!this.currentProjectId || !this.projectContextExplicitlySet) {
      return {
        success: false,
        error: 'Project context is mandatory. Please explicitly set a project before clearing todos using project_set.',
        message: 'Failed to clear todos: no explicit project context set'
      };
    }

    // Verify project exists in database
    const projectStmt = this.db.prepare('SELECT id FROM projects WHERE id = ?');
    const project = projectStmt.get(this.currentProjectId);
    
    if (!project) {
      return {
        success: false,
        error: 'Invalid project context. The current project does not exist in the database.',
        message: 'Failed to clear todos: invalid project context'
      };
    }

    try {
      const stmt = this.db.prepare('DELETE FROM todos WHERE projectId = ?');
      const result = stmt.run(this.currentProjectId);
      
      return { success: true, message: `Cleared ${result.changes} todos from current project` };
    } catch (error) {
      return {
        success: false,
        error: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        message: 'Failed to clear todos due to database error'
      };
    }
  }

  private async analyzeTodos(): Promise<any> {
    try {
      // Get all todos for current project
      const stmt = this.db.prepare('SELECT * FROM todos WHERE projectId = ? ORDER BY priority DESC, createdAt DESC');
      const dbTodos = stmt.all(this.currentProjectId);
      
      // Convert database results to proper Todo objects
      const todos = dbTodos.map((dbTodo: any) => ({
        id: dbTodo.id,
        name: dbTodo.name,
        status: dbTodo.status,
        createdAt: new Date(dbTodo.createdAt),
        updatedAt: new Date(dbTodo.updatedAt),
        priority: dbTodo.priority || 5,
        tags: dbTodo.tags ? JSON.parse(dbTodo.tags) : [],
        analysis: dbTodo.analysis ? JSON.parse(dbTodo.analysis) : undefined,
        projectId: dbTodo.projectId,
        detailedInstructions: dbTodo.detailedInstructions,
        aiGuidance: dbTodo.aiGuidance
      }));
      
      if (todos.length === 0) {
        return { 
          success: true, 
          data: { 
            analysis: '📊 No todos found in current project',
            updatedTodos: []
          }, 
          message: 'No todos to analyze' 
        };
      }

      let analysisResult: TodoAnalysisResponse;
      let updatedTodos: Todo[] = [];

      if (this.analysisEngine) {
        // Use AI analysis engine
        this.logger.info(`Performing AI analysis for ${todos.length} todos`);
        analysisResult = await this.analysisEngine.analyzeTodos(todos);
        
        // Update todos with AI-suggested priorities and tags
        updatedTodos = await this.updateTodosWithAIAnalysis(todos, analysisResult.analysis);
        
        // Generate AI guidance for each task
        await this.generateAIGuidance(updatedTodos);
        
        // Generate formatted analysis text
        const analysis = this.formatAIAnalysis(analysisResult, updatedTodos);
        
        return { 
          success: true, 
          data: { 
            analysis,
            updatedTodos,
            aiAnalysis: analysisResult
          }, 
          message: 'AI analysis completed successfully' 
        };
      } else {
        // Fallback to simple analysis
        const pendingTodos = todos.filter((todo: Todo) => todo.status === 'pending');
        const completedTodos = todos.filter((todo: Todo) => todo.status === 'completed');
        
        const analysis = `📊 Todo Analysis (Project: ${this.currentProjectId}):
• Total todos: ${todos.length}
• Pending: ${pendingTodos.length}
• Completed: ${completedTodos.length}
• Completion rate: ${todos.length > 0 ? Math.round((completedTodos.length / todos.length) * 100) : 0}%

${pendingTodos.length > 0 ? '⏳ Pending tasks by priority:\n' + pendingTodos
  .sort((a: Todo, b: Todo) => (a.priority || 5) - (b.priority || 5))
  .map((todo: Todo) => `  - [${todo.priority || 5}] ${todo.name}`).join('\n') : '🎉 No pending tasks!'}`;

        return { 
          success: true, 
          data: { 
            analysis,
            updatedTodos: []
          }, 
          message: 'Simple analysis completed (AI disabled)' 
        };
      }
    } catch (error) {
      this.logger.error('Analysis failed:', error);
      return { success: false, error: 'Failed to analyze todos' };
    }
  }

  private async generateAIGuidance(todos: Todo[]): Promise<void> {
    if (!this.analysisEngine) return;
    
    try {
      for (const todo of todos) {
        if (todo.status === 'completed' || todo.aiGuidance) continue;
        
        // Generate AI guidance for this specific task
        const guidance = await this.generateTaskGuidance(todo);
        
        // Update the todo with AI guidance
        const stmt = this.db.prepare('UPDATE todos SET aiGuidance = ? WHERE id = ?');
        stmt.run(guidance, todo.id);
      }
    } catch (error) {
      this.logger.error('Failed to generate AI guidance:', error);
    }
  }

  private async generateTaskGuidance(todo: Todo): Promise<string> {
    if (!this.analysisEngine) return '';
    
    try {
      // Use the analysis engine to generate guidance
      const response = await this.analysisEngine.analyzeTodos([todo]);
      return response.analysis[0]?.reasoning || 'AI guidance not available';
    } catch (error) {
      this.logger.error('Failed to generate task guidance:', error);
      return 'AI guidance generation failed';
    }
  }

  private async updateTodosWithAIAnalysis(todos: Todo[], aiAnalysis: any[]): Promise<Todo[]> {
    const updatedTodos: Todo[] = [];
    
    // AI analysis should match todos by index
    for (let i = 0; i < todos.length; i++) {
      const todo = todos[i];
      if (!todo) continue;
      
      const aiSuggestion = aiAnalysis[i];
      
      if (aiSuggestion) {
        // Update priority if AI suggests a different one
        if (aiSuggestion.priority && aiSuggestion.priority !== todo.priority) {
          const updateStmt = this.db.prepare('UPDATE todos SET priority = ?, updatedAt = ? WHERE id = ?');
          updateStmt.run(aiSuggestion.priority, new Date().toISOString(), todo.id);
          todo.priority = aiSuggestion.priority;
        }
        
        // Update tags if AI suggests new ones
        if (aiSuggestion.tags && aiSuggestion.tags.length > 0) {
          const newTags = [...new Set([...(todo.tags || []), ...aiSuggestion.tags])];
          const updateStmt = this.db.prepare('UPDATE todos SET tags = ?, updatedAt = ? WHERE id = ?');
          updateStmt.run(JSON.stringify(newTags), new Date().toISOString(), todo.id);
          todo.tags = newTags;
        }
        
        // Store AI analysis
        const analysisStmt = this.db.prepare('UPDATE todos SET analysis = ?, updatedAt = ? WHERE id = ?');
        analysisStmt.run(JSON.stringify(aiSuggestion), new Date().toISOString(), todo.id);
        todo.analysis = aiSuggestion;
      }
      
      updatedTodos.push(todo);
    }
    
    return updatedTodos;
  }

  private formatAIAnalysis(analysisResult: TodoAnalysisResponse, updatedTodos: Todo[]): string {
    const { analysis, summary } = analysisResult;
    
    let formatted = `🤖 AI Analysis Results:\n`;
    formatted += `• Total analyzed: ${summary.totalAnalyzed}\n`;
    formatted += `• High impact: ${summary.highImpact}\n`;
    formatted += `• Medium impact: ${summary.mediumImpact}\n`;
    formatted += `• Low impact: ${summary.lowImpact}\n\n`;
    
    if (analysis.length > 0) {
      formatted += `📋 Prioritized Tasks:\n`;
      analysis
        .sort((a, b) => a.priority - b.priority)
        .forEach((item, index) => {
          const todo = updatedTodos[index];
          formatted += `${index + 1}. [${item.priority}] ${todo?.name || 'Unknown Task'}\n`;
          formatted += `   💡 ${item.reasoning}\n`;
          formatted += `   🎯 Impact: ${item.estimatedImpact}\n`;
          if (item.tags && item.tags.length > 0) {
            formatted += `   🏷️  Tags: ${item.tags.join(', ')}\n`;
          }
          formatted += `\n`;
        });
    }
    
    return formatted;
  }

  private async setProjectInternal(path: string, name?: string, explicitlySet: boolean = true): Promise<{ success: boolean; data?: Project; message: string; error?: string }> {
    // Normalize path (remove trailing slash)
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
    
    // Check if project exists (try both with and without trailing slash)
    let stmt = this.db.prepare('SELECT * FROM projects WHERE path = ? OR path = ?');
    let project = stmt.get(normalizedPath, normalizedPath + '/');
    
    // If still not found, try to find by name if it's a known project
    if (!project && name) {
      stmt = this.db.prepare('SELECT * FROM projects WHERE name = ? ORDER BY createdAt DESC LIMIT 1');
      project = stmt.get(name);
    }
    
    if (!project) {
      // Create new project
      const projectId = uuidv4();
      const now = new Date().toISOString();
      stmt = this.db.prepare('INSERT INTO projects (id, name, path, createdAt) VALUES (?, ?, ?, ?)');
      stmt.run(projectId, name || normalizedPath.split('/').pop() || 'Unknown Project', normalizedPath, now);
      project = { id: projectId, name: name || normalizedPath.split('/').pop() || 'Unknown Project', path: normalizedPath, createdAt: now };
    }
    
    this.currentProjectId = project.id;
    this.projectContextExplicitlySet = explicitlySet;
    
    return {
      success: true,
      data: project,
      message: `Switched to project: ${project.name}`
    };
  }

  private async setProject(path: string, name?: string): Promise<{ success: boolean; data?: Project; message: string; error?: string }> {
    return this.setProjectInternal(path, name, true);
  }

  private async autoDetectProject(): Promise<{ success: boolean; data?: Project; message: string; error?: string }> {
    try {
      // Use enhanced Cursor IDE detection first
      const projectPath = this.detectCurrentProjectFromCursor();
      const projectName = this.detectProjectName(projectPath);
      const result = await this.setProject(projectPath, projectName);
      
      if (result.data) {
        return {
          success: true,
          data: result.data,
          message: `Auto-detected and switched to project: ${result.data.name} (${projectPath})`
        };
      } else {
        return {
          success: false,
          message: 'Failed to set project context',
          error: 'Project data not available'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to auto-detect project',
        error: error instanceof Error ? error.message : 'Failed to auto-detect project'
      };
    }
  }

  private getTotalTodos(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM todos');
    const result = stmt.get();
    return result?.count || 0;
  }

  private detectCurrentProject(): string {
    // Priority 1: Check for IDE-specific environment variables
    const ideProjectPath = process.env['CURSOR_PROJECT_PATH'] || 
                          process.env['VSCODE_PROJECT_PATH'] || 
                          process.env['WORKSPACE_PATH'] ||
                          process.env['PROJECT_PATH'];
    
    if (ideProjectPath && fs.existsSync(ideProjectPath)) {
      this.logger.info(`Detected IDE project path: ${ideProjectPath}`);
      return ideProjectPath;
    }
    
    // Priority 2: Check for Cursor IDE workspace file
    const cursorWorkspace = process.env['CURSOR_WORKSPACE'] || 
                           process.env['VSCODE_WORKSPACE'];
    if (cursorWorkspace && fs.existsSync(cursorWorkspace)) {
      try {
        const workspaceContent = fs.readFileSync(cursorWorkspace, 'utf8');
        const workspace = JSON.parse(workspaceContent);
        if (workspace.folders && workspace.folders.length > 0) {
          const firstFolder = workspace.folders[0];
          const projectPath = firstFolder.path.startsWith('/') ? 
                             firstFolder.path : 
                             path.resolve(path.dirname(cursorWorkspace), firstFolder.path);
          if (fs.existsSync(projectPath)) {
            this.logger.info(`Detected workspace project path: ${projectPath}`);
            return projectPath;
          }
        }
      } catch (error) {
        this.logger.warn('Failed to parse workspace file:', error);
      }
    }
    
    // Priority 3: Check for .cursor or .vscode directory in current working directory
    const cwd = process.cwd();
    const cursorDir = path.join(cwd, '.cursor');
    const vscodeDir = path.join(cwd, '.vscode');
    
    if (fs.existsSync(cursorDir) || fs.existsSync(vscodeDir)) {
      this.logger.info(`Detected IDE project directory: ${cwd}`);
      return cwd;
    }
    
    // Priority 4: Check if current directory is a Git repository
    if (fs.existsSync(path.join(cwd, '.git'))) {
      this.logger.info(`Detected Git repository: ${cwd}`);
      return cwd;
    }
    
    // Priority 5: Check for project files in current directory
    const projectFiles = ['package.json', 'Cargo.toml', 'go.mod', 'requirements.txt', 'composer.json', 'Gemfile'];
    for (const file of projectFiles) {
      if (fs.existsSync(path.join(cwd, file))) {
        this.logger.info(`Detected project with ${file}: ${cwd}`);
        return cwd;
      }
    }
    
    // Fallback: Use current working directory
    this.logger.info(`Using current working directory: ${cwd}`);
    return cwd;
  }

  // Enhanced project detection for Cursor IDE integration
  private detectCurrentProjectFromCursor(): string {
    // Try to get the current workspace from Cursor IDE context
    // This method will be called when the MCP server is initialized from Cursor IDE
    
    // Check if we're running in Cursor IDE context
    const isCursorContext = process.env['CURSOR_AI'] === 'true' || 
                           process.env['CURSOR_WORKSPACE'] !== undefined ||
                           process.env['VSCODE_PID'] !== undefined;
    
    if (isCursorContext) {
      // Try to get workspace from Cursor IDE environment
      const workspacePath = process.env['CURSOR_WORKSPACE'] || 
                           process.env['VSCODE_WORKSPACE'] ||
                           process.env['WORKSPACE_PATH'];
      
      if (workspacePath) {
        // If it's a workspace file, parse it
        if (workspacePath.endsWith('.code-workspace') || workspacePath.endsWith('.cursor-workspace')) {
          try {
            const workspaceContent = fs.readFileSync(workspacePath, 'utf8');
            const workspace = JSON.parse(workspaceContent);
            if (workspace.folders && workspace.folders.length > 0) {
              const firstFolder = workspace.folders[0];
              const projectPath = firstFolder.path.startsWith('/') ? 
                                 firstFolder.path : 
                                 path.resolve(path.dirname(workspacePath), firstFolder.path);
              if (fs.existsSync(projectPath)) {
                this.logger.info(`Detected Cursor IDE workspace project: ${projectPath}`);
                return projectPath;
              }
            }
          } catch (error) {
            this.logger.warn('Failed to parse Cursor workspace file:', error);
          }
        } else if (fs.existsSync(workspacePath)) {
          // Direct path to project directory
          this.logger.info(`Detected Cursor IDE project path: ${workspacePath}`);
          return workspacePath;
        }
      }
    }
    
    // Fallback to standard detection
    return this.detectCurrentProject();
  }


  // Detect project from Cursor IDE workspace path
  private async detectProjectFromCursor(workspacePath: string): Promise<{ success: boolean; data?: Project; message: string; error?: string }> {
    try {
      if (!workspacePath) {
        return {
          success: false,
          message: 'No workspace path provided',
          error: 'Workspace path is required'
        };
      }

      // Normalize the path
      const normalizedPath = workspacePath.endsWith('/') ? workspacePath.slice(0, -1) : workspacePath;
      
      // Check if the path exists
      if (!fs.existsSync(normalizedPath)) {
        return {
          success: false,
          message: 'Workspace path does not exist',
          error: `Path not found: ${normalizedPath}`
        };
      }

      // Detect project name
      const projectName = this.detectProjectName(normalizedPath);
      
      // Set the project
      const result = await this.setProject(normalizedPath, projectName);
      
      if (result.data) {
        return {
          success: true,
          data: result.data,
          message: `Detected and switched to Cursor IDE project: ${result.data.name} (${normalizedPath})`
        };
      } else {
        return {
          success: false,
          message: 'Failed to set project context',
          error: 'Project data not available'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to detect project from Cursor IDE',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private detectProjectName(projectPath: string): string {
    // Try to detect project name from various sources
    const pathParts = projectPath.split(path.sep);
    const dirName = pathParts[pathParts.length - 1];
    
    // Check for package.json
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        if (packageJson.name) {
          return packageJson.name;
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }
    
    // Check for .git directory (Git repository)
    if (fs.existsSync(path.join(projectPath, '.git'))) {
      return dirName || 'Unknown Project';
    }
    
    // Check for common project files
    const projectFiles = ['Cargo.toml', 'go.mod', 'requirements.txt', 'composer.json', 'Gemfile'];
    for (const file of projectFiles) {
      if (fs.existsSync(path.join(projectPath, file))) {
        return dirName || 'Unknown Project';
      }
    }
    
    // Fallback to directory name
    return dirName || 'Unknown Project';
  }

  public async start(): Promise<void> {
    // Auto-detect project from current working directory or IDE context
    const projectPath = this.detectCurrentProjectFromCursor();
    const projectName = this.detectProjectName(projectPath);
    
    // Set project context but don't mark as explicitly set (for validation)
    await this.setProjectInternal(projectPath, projectName, false);
    
    // Start HTTP server
    this.httpApp.listen(this.port, () => {
      console.log(`🚀 MCP Todo Server started`);
      const baseUrl = process.env['BASE_URL'] || 'http://localhost';
      console.log(`📱 Web UI: ${baseUrl}:${this.port}`);
      console.log(`🔧 API: ${baseUrl}:${this.port}/api`);
      console.log(`📋 Health: ${baseUrl}:${this.port}/health`);
      console.log(`📁 Project: ${projectPath}`);
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
        // Auto-detect and set project context when MCP is initialized
        try {
          const projectPath = this.detectCurrentProjectFromCursor();
          const projectName = this.detectProjectName(projectPath);
          await this.setProject(projectPath, projectName);
          this.logger.info(`MCP initialized with project: ${projectName} (${projectPath})`);
        } catch (error) {
          this.logger.warn('Failed to auto-detect project on MCP initialization:', error);
        }
        // No response needed for initialized notification
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
              },
              {
                name: 'project_auto_detect',
                description: 'Auto-detect and switch to current IDE project',
                inputSchema: {
                  type: 'object',
                  properties: {}
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
          result = await this.addTodo(args?.['name'] as string, args?.['priority'] as number, args?.['tags'] as string[]);
          break;
        case 'todo_list':
          result = await this.listTodos(args?.['status'] as string);
          break;
        case 'todo_mark_done':
          result = await this.markTodoDone(args?.['id'] as string);
          break;
        case 'todo_remove':
          result = await this.removeTodo(args?.['id'] as string);
          break;
        case 'todo_clear':
          result = await this.clearTodos();
          break;
        case 'project_set':
          result = await this.setProject(args?.['path'] as string, args?.['name'] as string);
          break;
        case 'project_auto_detect':
          result = await this.autoDetectProject();
          break;
        case 'project_detect_cursor':
          result = await this.detectProjectFromCursor(args?.['workspacePath'] as string);
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
            // Handle MCP request asynchronously
            (async () => {
              try {
                const response = await this.handleMCPRequest(request);
                if (response) {
                  process.stdout.write(JSON.stringify(response) + '\n');
                }
              } catch (error) {
                console.error('Failed to process MCP request:', error);
              }
            })();
          } catch (error) {
            console.error('Failed to parse MCP request:', error);
          }
        }
      }
    });
  }
}

// CLI handling
if (process.argv.includes('--stdio')) {
  // MCP mode: run stdio handler AND start HTTP server so the web UI is available
  // Suppress console output for MCP mode to avoid interfering with stdio
  console.log = () => {};
  console.error = () => {};
  
  // Redirect stderr to devnull to suppress dotenv and other output
  process.stderr.write = () => true;
  
  const server = new UnifiedMCPServer();
  
  // Start HTTP server (non-blocking) so http://localhost:3300 is available
  server.start();
  
  // Handle MCP requests via stdio
  server.handleStdio();
} else {
  // HTTP mode only
  const port = parseInt(process.env['SERVER_PORT'] || process.env['PORT'] || '3300');
  const server = new UnifiedMCPServer(port);
  server.start();
}

export default UnifiedMCPServer;
