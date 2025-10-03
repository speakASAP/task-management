import { RedisClient } from '../redis/client.js';
import { Todo, TodoListResponse, TodoAnalysisResponse, MCPToolResult, TodoStatus, ServerConfig } from '../types/index.js';
export declare class TodoStorage {
    private redis;
    private logger;
    private sessionId;
    private analysisEngine;
    private cache;
    constructor(redis: RedisClient, sessionId?: string, config?: ServerConfig);
    private getTodoKey;
    private getSessionKey;
    private getTodosListKey;
    addTodo(name: string): Promise<MCPToolResult<Todo>>;
    listTodos(status?: TodoStatus | 'all'): Promise<MCPToolResult<TodoListResponse>>;
    removeTodo(id: string): Promise<MCPToolResult<boolean>>;
    markTodoDone(id: string): Promise<MCPToolResult<Todo>>;
    clearTodos(): Promise<MCPToolResult<number>>;
    analyzeTodos(): Promise<MCPToolResult<TodoAnalysisResponse>>;
    setSessionId(sessionId: string): void;
    getSessionId(): string;
    private invalidateCache;
}
//# sourceMappingURL=todo-storage.d.ts.map