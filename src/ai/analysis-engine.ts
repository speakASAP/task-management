// AI analysis engine for todo prioritization
import { OpenAIClient } from './openai-client.js';
import { RedisClient } from '../redis/client.js';
import { Logger } from '../utils/logger.js';
import { Todo, TodoAnalysis, TodoAnalysisResponse, ServerConfig } from '../types/index.js';

export class AnalysisEngine {
    private openaiClient: OpenAIClient | null = null;
    private redis: RedisClient;
    private config: ServerConfig;
    private logger: Logger;
    private cacheKey: string = 'ai_analysis_cache';

    constructor(redis: RedisClient, config: ServerConfig) {
        this.redis = redis;
        this.config = config;
        this.logger = new Logger(config.logLevel);
        
        if (config.openaiApiKey) {
            this.openaiClient = new OpenAIClient(config.openaiApiKey, config.openaiModel);
        } else {
            this.logger.warn('OpenAI API key not provided, AI analysis will use fallback methods');
        }
    }

    public async analyzeTodos(todos: Todo[]): Promise<TodoAnalysisResponse> {
        try {
            if (!this.config.aiAnalysisEnabled) {
                this.logger.info('AI analysis is disabled, using fallback analysis');
                return this.generateFallbackAnalysis(todos);
            }

            if (!this.openaiClient) {
                this.logger.warn('OpenAI client not available, using fallback analysis');
                return this.generateFallbackAnalysis(todos);
            }

            // Check cache first
            const cachedAnalysis = await this.getCachedAnalysis(todos);
            if (cachedAnalysis) {
                this.logger.debug('Using cached AI analysis');
                return cachedAnalysis;
            }

            // Perform AI analysis
            const analysis = await this.performAIAnalysis(todos);
            
            // Cache the results
            await this.cacheAnalysis(todos, analysis);

            return analysis;
        } catch (error) {
            this.logger.error('AI analysis failed, falling back to simple analysis:', error);
            return this.generateFallbackAnalysis(todos);
        }
    }

    private async performAIAnalysis(todos: Todo[]): Promise<TodoAnalysisResponse> {
        if (!this.openaiClient) {
            throw new Error('OpenAI client not available');
        }

        try {
            const analysis = await this.openaiClient.analyzeTodos(todos);
            
            const response: TodoAnalysisResponse = {
                analysis,
                summary: {
                    totalAnalyzed: analysis.length,
                    highImpact: analysis.filter(a => a.estimatedImpact === 'high').length,
                    mediumImpact: analysis.filter(a => a.estimatedImpact === 'medium').length,
                    lowImpact: analysis.filter(a => a.estimatedImpact === 'low').length
                }
            };

            this.logger.info(`AI analysis completed for ${todos.length} todos`);
            return response;
        } catch (error) {
            this.logger.error('OpenAI analysis failed:', error);
            throw error;
        }
    }

    private generateFallbackAnalysis(todos: Todo[]): TodoAnalysisResponse {
        const analysis: TodoAnalysis[] = todos.map((todo, index) => {
            // Simple priority based on creation time and status
            let priority = 5; // Default priority
            
            if (todo.status === 'completed') {
                priority = 1; // Completed todos have lowest priority
            } else {
                // Pending todos get priority based on age (newer = higher priority)
                const ageInHours = (Date.now() - todo.createdAt.getTime()) / (1000 * 60 * 60);
                priority = Math.max(1, Math.min(10, 10 - Math.floor(ageInHours / 24)));
            }

            const estimatedImpact = priority >= 8 ? 'high' : priority >= 5 ? 'medium' : 'low';
            
            return {
                priority,
                reasoning: `Fallback analysis: ${todo.status === 'completed' ? 'Completed task' : 'Pending task created ' + Math.floor((Date.now() - todo.createdAt.getTime()) / (1000 * 60 * 60)) + ' hours ago'}`,
                suggestedOrder: index + 1,
                estimatedImpact,
                tags: ['fallback-analysis'],
                createdAt: new Date()
            };
        });

        // Sort by priority (highest first)
        analysis.sort((a, b) => b.priority - a.priority);
        
        // Update suggested order after sorting
        analysis.forEach((item, index) => {
            item.suggestedOrder = index + 1;
        });

        return {
            analysis,
            summary: {
                totalAnalyzed: analysis.length,
                highImpact: analysis.filter(a => a.estimatedImpact === 'high').length,
                mediumImpact: analysis.filter(a => a.estimatedImpact === 'medium').length,
                lowImpact: analysis.filter(a => a.estimatedImpact === 'low').length
            }
        };
    }

    private async getCachedAnalysis(todos: Todo[]): Promise<TodoAnalysisResponse | null> {
        try {
            const cacheKey = this.getCacheKey(todos);
            const cached = await this.redis.get(cacheKey);
            
            if (cached) {
                return JSON.parse(cached);
            }
            
            return null;
        } catch (error) {
            this.logger.warn('Failed to get cached analysis:', error);
            return null;
        }
    }

    private async cacheAnalysis(todos: Todo[], analysis: TodoAnalysisResponse): Promise<void> {
        try {
            const cacheKey = this.getCacheKey(todos);
            const cacheData = JSON.stringify(analysis);
            
            await this.redis.set(cacheKey, cacheData, this.config.aiAnalysisCacheTtl);
            this.logger.debug('Analysis cached successfully');
        } catch (error) {
            this.logger.warn('Failed to cache analysis:', error);
        }
    }

    private getCacheKey(todos: Todo[]): string {
        // Create a hash of the todos for cache key
        const todoIds = todos.map(t => t.id).sort().join(',');
        const todoStatuses = todos.map(t => t.status).sort().join(',');
        return `${this.cacheKey}:${Buffer.from(todoIds + todoStatuses).toString('base64').slice(0, 16)}`;
    }

    public async clearCache(): Promise<void> {
        try {
            const pattern = `${this.cacheKey}:*`;
            const keys = await this.redis.keys(pattern);
            
            for (const key of keys) {
                await this.redis.del(key);
            }
            
            this.logger.info(`Cleared ${keys.length} cached analyses`);
        } catch (error) {
            this.logger.error('Failed to clear analysis cache:', error);
        }
    }

    public isHealthy(): boolean {
        return this.openaiClient ? this.openaiClient.isHealthy() : true;
    }

    public getStats(): { cacheHits: number; cacheMisses: number; aiCalls: number } {
        // This would be implemented with proper metrics collection
        return {
            cacheHits: 0,
            cacheMisses: 0,
            aiCalls: 0
        };
    }
}
