export interface Todo {
    id: string;
    name: string;
    status: 'pending' | 'completed';
    createdAt: Date;
    updatedAt: Date;
    priority?: number;
    analysis?: TodoAnalysis;
}
export interface TodoAnalysis {
    priority: number;
    reasoning: string;
    suggestedOrder: number;
    estimatedImpact: 'low' | 'medium' | 'high';
    tags: string[];
    createdAt: Date;
}
export interface TodoCreateInput {
    name: string;
}
export interface TodoUpdateInput {
    id: string;
    name?: string;
    status?: 'pending' | 'completed';
}
export interface TodoListResponse {
    todos: Todo[];
    total: number;
    pending: number;
    completed: number;
}
export interface TodoAnalysisResponse {
    analysis: TodoAnalysis[];
    summary: {
        totalAnalyzed: number;
        highImpact: number;
        mediumImpact: number;
        lowImpact: number;
    };
}
export interface MCPToolResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface ServerConfig {
    port: number;
    nodeId: string;
    redisUrl: string;
    openaiApiKey: string;
    openaiModel: string;
    logLevel: string;
    aiAnalysisEnabled: boolean;
    aiAnalysisCacheTtl: number;
    aiAnalysisBatchSize: number;
    redisPoolSize: number;
    cacheTtl: number;
    maxConcurrentRequests: number;
}
export interface RedisConfig {
    url: string;
    poolSize: number;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
    lazyConnect: boolean;
}
export interface AIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
    retries: number;
}
export interface CacheConfig {
    ttl: number;
    maxSize: number;
    checkPeriod: number;
}
export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    nodeId: string;
    uptime: number;
    redis: {
        connected: boolean;
        latency?: number;
    };
    ai: {
        available: boolean;
        lastCheck?: Date;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
}
export interface SessionData {
    sessionId: string;
    nodeId: string;
    createdAt: Date;
    lastActivity: Date;
    todoCount: number;
}
export interface StateSyncEvent {
    type: 'todo_added' | 'todo_updated' | 'todo_removed' | 'todo_cleared';
    sessionId: string;
    nodeId: string;
    data: any;
    timestamp: Date;
}
export interface ErrorResponse {
    error: string;
    code: string;
    details?: any;
    timestamp: Date;
}
export type TodoStatus = 'pending' | 'completed';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type AnalysisImpact = 'low' | 'medium' | 'high';
//# sourceMappingURL=index.d.ts.map