// MCP Server implementation for Todo Application
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { ServerConfig, HealthCheckResponse, MCPToolResult } from './types/index.js';
import { TodoStorage } from './storage/todo-storage.js';
import { RedisClient } from './redis/client.js';
import { StateSync } from './sync/state-sync.js';
import { Logger } from './utils/logger.js';
import { registerTools } from './tools/index.js';

// Load environment variables
dotenv.config();

export class MCPServer {
    private server!: Server;
    private app: express.Application;
    private config: ServerConfig;
    private todoStorage: TodoStorage;
    private redisClient: RedisClient;
    private stateSync: StateSync;
    private logger: Logger;
    private startTime: Date;

    constructor() {
        this.startTime = new Date();
        this.config = this.loadConfig();
        this.logger = new Logger(this.config.logLevel);
        this.redisClient = new RedisClient(this.config.redisUrl, this.config.redisPoolSize);
        this.todoStorage = new TodoStorage(this.redisClient, 'global', this.config);
        this.stateSync = new StateSync(this.redisClient, this.config.nodeId);
        
        this.app = express();
        this.setupExpress();
        this.setupMCPServer();
    }

    private loadConfig(): ServerConfig {
        return {
            port: parseInt(process.env.SERVER_PORT || process.env.PORT || '3300'),
            nodeId: this.determineNodeId(),
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            openaiApiKey: process.env.OPENAI_API_KEY || '',
            openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
            logLevel: process.env.LOG_LEVEL || 'info',
            aiAnalysisEnabled: process.env.AI_ANALYSIS_ENABLED === 'true',
            aiAnalysisCacheTtl: parseInt(process.env.AI_ANALYSIS_CACHE_TTL || '300'),
            aiAnalysisBatchSize: parseInt(process.env.AI_ANALYSIS_BATCH_SIZE || '10'),
            redisPoolSize: parseInt(process.env.REDIS_POOL_SIZE || '10'),
            cacheTtl: parseInt(process.env.CACHE_TTL || '600'),
            maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100')
        };
    }

    private determineNodeId(): string {
        // Check for specific node IDs first (for multi-node deployments)
        if (process.env.NODE_1_ID) {
            return process.env.NODE_1_ID;
        }
        if (process.env.NODE_2_ID) {
            return process.env.NODE_2_ID;
        }
        
        // Fallback to generic NODE_ID (for single-node deployments)
        if (process.env.NODE_ID) {
            return process.env.NODE_ID;
        }
        
        // Default fallback
        return 'node-1';
    }

    private setupExpress(): void {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Health check endpoint
        this.app.get('/health', async (_req, res) => {
            try {
                const health = await this.getHealthStatus();
                res.status(health.status === 'healthy' ? 200 : 503).json(health);
            } catch (error) {
                this.logger.error('Health check failed:', error);
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date(),
                    error: 'Health check failed'
                });
            }
        });

        // MCP endpoint
        this.app.post('/mcp', async (req, res) => {
            try {
                const { method, params, id } = req.body;
                
                if (method === 'tools/list') {
                    res.json({
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
                                            }
                                        },
                                        required: ['name']
                                    }
                                },
                                {
                                    name: 'todo_list',
                                    description: 'List all todo items',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {
                                            status: {
                                                type: 'string',
                                                enum: ['pending', 'completed', 'all'],
                                                description: 'Filter by status (optional)'
                                            }
                                        }
                                    }
                                },
                                {
                                    name: 'todo_remove',
                                    description: 'Remove a todo item by ID',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {
                                            id: {
                                                type: 'string',
                                                description: 'ID of the todo item to remove'
                                            }
                                        },
                                        required: ['id']
                                    }
                                },
                                {
                                    name: 'todo_mark_done',
                                    description: 'Mark a todo item as completed',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {
                                            id: {
                                                type: 'string',
                                                description: 'ID of the todo item to mark as done'
                                            }
                                        },
                                        required: ['id']
                                    }
                                },
                                {
                                    name: 'todo_clear',
                                    description: 'Clear all todo items',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'todo_analyze',
                                    description: 'Analyze and prioritize todo items using AI',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {}
                                    }
                                }
                            ]
                        }
                    });
                } else if (method === 'tools/call' && params) {
                    const { name, arguments: args } = params;
                    let result: MCPToolResult;
                    
                    switch (name) {
                        case 'todo_add':
                            result = await this.todoStorage.addTodo((args as any)?.name || '');
                            break;
                        case 'todo_list':
                            result = await this.todoStorage.listTodos((args as any)?.status || 'all');
                            break;
                        case 'todo_remove':
                            result = await this.todoStorage.removeTodo((args as any)?.id || '');
                            break;
                        case 'todo_mark_done':
                            result = await this.todoStorage.markTodoDone((args as any)?.id || '');
                            break;
                        case 'todo_clear':
                            result = await this.todoStorage.clearTodos();
                            break;
                        case 'todo_analyze':
                            result = await this.todoStorage.analyzeTodos();
                            break;
                        default:
                            result = {
                                success: false,
                                error: `Unknown tool: ${name}`
                            };
                    }
                    
                    res.json({
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
                    });
                } else {
                    res.json({
                        jsonrpc: '2.0',
                        id,
                        error: {
                            code: -32601,
                            message: 'Method not found'
                        }
                    });
                }
            } catch (error) {
                this.logger.error('MCP request failed:', error);
                res.status(500).json({
                    jsonrpc: '2.0',
                    id: req.body.id,
                    error: {
                        code: -32603,
                        message: 'Internal error'
                    }
                });
            }
        });

        // Root endpoint
        this.app.get('/', (_req, res) => {
            res.json({
                name: 'MCP Todo Server',
                version: '1.0.0',
                nodeId: this.config.nodeId,
                status: 'running',
                uptime: Date.now() - this.startTime.getTime()
            });
        });
    }

    private setupMCPServer(): void {
        this.server = new Server(
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

        // Register MCP tools
        registerTools(this.server, this.todoStorage, this.stateSync, this.config);

        // Handle MCP requests
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
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
                                }
                            },
                            required: ['name']
                        }
                    },
                    {
                        name: 'todo_list',
                        description: 'List all todo items',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['pending', 'completed', 'all'],
                                    description: 'Filter by status (optional)'
                                }
                            }
                        }
                    },
                    {
                        name: 'todo_remove',
                        description: 'Remove a todo item by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'ID of the todo item to remove'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'todo_mark_done',
                        description: 'Mark a todo item as completed',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'ID of the todo item to mark as done'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'todo_clear',
                        description: 'Clear all todo items',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'todo_analyze',
                        description: 'Analyze and prioritize todo items using AI',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                let result: MCPToolResult;
                
                switch (name) {
                    case 'todo_add':
                        result = await this.todoStorage.addTodo((args as any)?.name || '');
                        break;
                    case 'todo_list':
                        result = await this.todoStorage.listTodos((args as any)?.status || 'all');
                        break;
                    case 'todo_remove':
                        result = await this.todoStorage.removeTodo((args as any)?.id || '');
                        break;
                    case 'todo_mark_done':
                        result = await this.todoStorage.markTodoDone((args as any)?.id || '');
                        break;
                    case 'todo_clear':
                        result = await this.todoStorage.clearTodos();
                        break;
                    case 'todo_analyze':
                        result = await this.todoStorage.analyzeTodos();
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
                this.logger.error(`Tool ${name} failed:`, error);
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


    private async getHealthStatus(): Promise<HealthCheckResponse> {
        const uptime = Date.now() - this.startTime.getTime();
        const memoryUsage = process.memoryUsage();
        
        let redisConnected = false;
        let redisLatency: number | undefined;
        
        try {
            const start = Date.now();
            await this.redisClient.ping();
            redisLatency = Date.now() - start;
            redisConnected = true;
        } catch (error) {
            this.logger.warn('Redis health check failed:', error);
        }

        return {
            status: redisConnected ? 'healthy' : 'unhealthy',
            timestamp: new Date(),
            nodeId: this.config.nodeId,
            uptime,
            redis: {
                connected: redisConnected,
                latency: redisLatency
            },
            ai: {
                available: this.config.aiAnalysisEnabled && !!this.config.openaiApiKey,
                lastCheck: new Date()
            },
            memory: {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal,
                percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
            }
        };
    }

    public async start(): Promise<void> {
        try {
            // Initialize Redis connection
            await this.redisClient.connect();
            this.logger.info('Redis connected successfully');

            // Initialize state synchronization
            await this.stateSync.initialize();
            this.logger.info('State synchronization initialized');

            // Start Express server
            this.app.listen(this.config.port, () => {
                this.logger.info(`MCP Todo Server started on port ${this.config.port}`);
                this.logger.info(`Node ID: ${this.config.nodeId}`);
                const baseUrl = process.env.BASE_URL || 'http://localhost';
                this.logger.info(`Health check: ${baseUrl}:${this.config.port}/health`);
                this.logger.info(`MCP endpoint: ${baseUrl}:${this.config.port}/mcp`);
            });

        } catch (error) {
            this.logger.error('Failed to start server:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        try {
            await this.redisClient.disconnect();
            await this.stateSync.stop();
            this.todoStorage.destroy();
            this.logger.info('Server stopped gracefully');
        } catch (error) {
            this.logger.error('Error during server shutdown:', error);
        }
    }
}
