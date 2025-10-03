import { Todo, TodoAnalysis } from '../types/index.js';
export declare class OpenAIClient {
    private client;
    private config;
    private logger;
    private circuitBreakerState;
    private failureCount;
    private lastFailureTime;
    private readonly maxFailures;
    private readonly timeoutMs;
    constructor(apiKey: string, model?: string);
    private isCircuitBreakerOpen;
    private recordSuccess;
    private recordFailure;
    analyzeTodos(todos: Todo[]): Promise<TodoAnalysis[]>;
    private buildAnalysisPrompt;
    private parseAnalysisResponse;
    private generateFallbackAnalysis;
    isHealthy(): boolean;
    getCircuitBreakerState(): string;
    getFailureCount(): number;
}
//# sourceMappingURL=openai-client.d.ts.map