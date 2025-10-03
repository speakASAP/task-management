// Todo storage implementation using Redis
import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from '../redis/client.js';
import { Logger } from '../utils/logger.js';
import { AnalysisEngine } from '../ai/analysis-engine.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { 
    Todo, 
    TodoListResponse, 
    TodoAnalysisResponse,
    MCPToolResult,
    TodoStatus,
    ServerConfig
} from '../types/index.js';

export class TodoStorage {
    private redis: RedisClient;
    private logger: Logger;
    private sessionId: string;
    private analysisEngine: AnalysisEngine | null = null;
    private cache: MemoryCache<TodoListResponse>;

    constructor(redis: RedisClient, sessionId: string = 'default', config?: ServerConfig) {
        this.redis = redis;
        this.logger = new Logger();
        this.sessionId = sessionId;
        
        // Initialize memory cache
        this.cache = new MemoryCache({
            ttl: config?.cacheTtl || 600,
            maxSize: 100,
            checkPeriod: 60
        });
        
        if (config) {
            this.analysisEngine = new AnalysisEngine(redis, config);
        }
    }

    private getTodoKey(id: string): string {
        return `todo:${this.sessionId}:${id}`;
    }

    private getSessionKey(): string {
        return `session:${this.sessionId}`;
    }

    private getTodosListKey(): string {
        return `todos:${this.sessionId}`;
    }

    public async addTodo(name: string): Promise<MCPToolResult<Todo>> {
        try {
            const id = uuidv4();
            const now = new Date();
            
            const todo: Todo = {
                id,
                name,
                status: 'pending',
                createdAt: now,
                updatedAt: now
            };

            const todoKey = this.getTodoKey(id);
            await this.redis.hSet(todoKey, 'id', todo.id);
            await this.redis.hSet(todoKey, 'name', todo.name);
            await this.redis.hSet(todoKey, 'status', todo.status);
            await this.redis.hSet(todoKey, 'createdAt', todo.createdAt.toISOString());
            await this.redis.hSet(todoKey, 'updatedAt', todo.updatedAt.toISOString());

            // Add to todos list
            await this.redis.sAdd(this.getTodosListKey(), id);

            // Update session metadata
            await this.redis.hIncrBy(this.getSessionKey(), 'todoCount', 1);
            await this.redis.hSet(this.getSessionKey(), 'lastActivity', now.toISOString());

            // Invalidate cache
            this.invalidateCache();

            this.logger.info(`Todo added: ${id} - ${name}`);

            return {
                success: true,
                data: todo,
                message: 'Todo added successfully'
            };
        } catch (error) {
            this.logger.error('Failed to add todo:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public async listTodos(status: TodoStatus | 'all' = 'all'): Promise<MCPToolResult<TodoListResponse>> {
        try {
            // Check cache first
            const cacheKey = `todos:${this.sessionId}:${status}`;
            const cached = this.cache.get(cacheKey);
            
            if (cached) {
                this.logger.debug('Returning cached todo list');
                return {
                    success: true,
                    data: cached,
                    message: `Found ${cached.todos.length} todos (cached)`
                };
            }

            const todosListKey = this.getTodosListKey();
            const todoIds = await this.redis.sMembers(todosListKey);
            
            const todos: Todo[] = [];
            let pendingCount = 0;
            let completedCount = 0;

            for (const id of todoIds) {
                const todoKey = this.getTodoKey(id);
                const todoData = await this.redis.hGetAll(todoKey);
                
                if (Object.keys(todoData).length > 0) {
                    const todo: Todo = {
                        id: todoData.id,
                        name: todoData.name,
                        status: todoData.status as TodoStatus,
                        createdAt: new Date(todoData.createdAt),
                        updatedAt: new Date(todoData.updatedAt)
                    };

                    if (todoData.priority) {
                        todo.priority = parseInt(todoData.priority);
                    }

                    if (status === 'all' || todo.status === status) {
                        todos.push(todo);
                    }

                    if (todo.status === 'pending') {
                        pendingCount++;
                    } else if (todo.status === 'completed') {
                        completedCount++;
                    }
                }
            }

            // Sort by creation date (newest first)
            todos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            const response: TodoListResponse = {
                todos,
                total: todos.length,
                pending: pendingCount,
                completed: completedCount
            };

            // Cache the result
            this.cache.set(cacheKey, response);

            return {
                success: true,
                data: response,
                message: `Found ${todos.length} todos`
            };
        } catch (error) {
            this.logger.error('Failed to list todos:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public async removeTodo(id: string): Promise<MCPToolResult<boolean>> {
        try {
            const todoKey = this.getTodoKey(id);
            const exists = await this.redis.hExists(todoKey, 'id');
            
            if (!exists) {
                return {
                    success: false,
                    error: 'Todo not found'
                };
            }

            // Remove from Redis
            await this.redis.del(todoKey);
            await this.redis.sRem(this.getTodosListKey(), id);

            // Update session metadata
            await this.redis.hIncrBy(this.getSessionKey(), 'todoCount', -1);
            await this.redis.hSet(this.getSessionKey(), 'lastActivity', new Date().toISOString());

            // Invalidate cache
            this.invalidateCache();

            this.logger.info(`Todo removed: ${id}`);

            return {
                success: true,
                data: true,
                message: 'Todo removed successfully'
            };
        } catch (error) {
            this.logger.error('Failed to remove todo:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public async markTodoDone(id: string): Promise<MCPToolResult<Todo>> {
        try {
            const todoKey = this.getTodoKey(id);
            const exists = await this.redis.hExists(todoKey, 'id');
            
            if (!exists) {
                return {
                    success: false,
                    error: 'Todo not found'
                };
            }

            const now = new Date();
            await this.redis.hSet(todoKey, 'status', 'completed');
            await this.redis.hSet(todoKey, 'updatedAt', now.toISOString());

            // Invalidate cache
            this.invalidateCache();

            // Get updated todo
            const todoData = await this.redis.hGetAll(todoKey);
            const todo: Todo = {
                id: todoData.id,
                name: todoData.name,
                status: 'completed',
                createdAt: new Date(todoData.createdAt),
                updatedAt: new Date(todoData.updatedAt)
            };

            if (todoData.priority) {
                todo.priority = parseInt(todoData.priority);
            }

            this.logger.info(`Todo marked as done: ${id}`);

            return {
                success: true,
                data: todo,
                message: 'Todo marked as completed'
            };
        } catch (error) {
            this.logger.error('Failed to mark todo as done:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public async clearTodos(): Promise<MCPToolResult<number>> {
        try {
            const todosListKey = this.getTodosListKey();
            const todoIds = await this.redis.sMembers(todosListKey);
            
            let clearedCount = 0;
            for (const id of todoIds) {
                const todoKey = this.getTodoKey(id);
                await this.redis.del(todoKey);
                clearedCount++;
            }

            // Clear the todos list
            await this.redis.del(todosListKey);

            // Reset session metadata
            await this.redis.hSet(this.getSessionKey(), 'todoCount', '0');
            await this.redis.hSet(this.getSessionKey(), 'lastActivity', new Date().toISOString());

            // Clear cache
            this.cache.clear();

            this.logger.info(`Cleared ${clearedCount} todos`);

            return {
                success: true,
                data: clearedCount,
                message: `Cleared ${clearedCount} todos`
            };
        } catch (error) {
            this.logger.error('Failed to clear todos:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public async analyzeTodos(): Promise<MCPToolResult<TodoAnalysisResponse>> {
        try {
            const listResult = await this.listTodos('all');
            
            if (!listResult.success || !listResult.data) {
                return {
                    success: false,
                    error: 'Failed to retrieve todos for analysis'
                };
            }

            const todos = listResult.data.todos;
            
            if (todos.length === 0) {
                return {
                    success: true,
                    data: {
                        analysis: [],
                        summary: {
                            totalAnalyzed: 0,
                            highImpact: 0,
                            mediumImpact: 0,
                            lowImpact: 0
                        }
                    },
                    message: 'No todos to analyze'
                };
            }

            let analysisResponse: TodoAnalysisResponse;
            
            if (this.analysisEngine) {
                // Use AI analysis engine
                analysisResponse = await this.analysisEngine.analyzeTodos(todos);
            } else {
                // Fallback to simple analysis
                const analysis = todos.map((todo, index) => ({
                    priority: Math.max(1, 10 - index),
                    reasoning: `Todo "${todo.name}" is priority ${Math.max(1, 10 - index)} based on creation order`,
                    suggestedOrder: index + 1,
                    estimatedImpact: index < 3 ? 'high' as const : index < 6 ? 'medium' as const : 'low' as const,
                    tags: ['general'],
                    createdAt: new Date()
                }));

                analysisResponse = {
                    analysis,
                    summary: {
                        totalAnalyzed: todos.length,
                        highImpact: analysis.filter(a => a.estimatedImpact === 'high').length,
                        mediumImpact: analysis.filter(a => a.estimatedImpact === 'medium').length,
                        lowImpact: analysis.filter(a => a.estimatedImpact === 'low').length
                    }
                };
            }

            return {
                success: true,
                data: analysisResponse,
                message: `Analyzed ${todos.length} todos using ${this.analysisEngine ? 'AI' : 'fallback'} analysis`
            };
        } catch (error) {
            this.logger.error('Failed to analyze todos:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    public setSessionId(sessionId: string): void {
        this.sessionId = sessionId;
    }

    public getSessionId(): string {
        return this.sessionId;
    }

    private invalidateCache(): void {
        // Clear all todo-related cache entries
        const keys = this.cache.keys();
        for (const key of keys) {
            if (key.startsWith(`todos:${this.sessionId}:`)) {
                this.cache.delete(key);
            }
        }
        this.logger.debug('Cache invalidated for todo operations');
    }
}
