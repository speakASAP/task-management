import { RedisClient } from '../redis/client.js';
import { Todo, TodoAnalysisResponse, ServerConfig } from '../types/index.js';
export declare class AnalysisEngine {
    private openaiClient;
    private redis;
    private config;
    private logger;
    private cacheKey;
    constructor(redis: RedisClient, config: ServerConfig);
    analyzeTodos(todos: Todo[]): Promise<TodoAnalysisResponse>;
    private performAIAnalysis;
    private generateFallbackAnalysis;
    private getCachedAnalysis;
    private cacheAnalysis;
    private getCacheKey;
    clearCache(): Promise<void>;
    isHealthy(): boolean;
    getStats(): {
        cacheHits: number;
        cacheMisses: number;
        aiCalls: number;
    };
}
//# sourceMappingURL=analysis-engine.d.ts.map