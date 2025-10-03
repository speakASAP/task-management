// AI analysis engine for todo prioritization
import { OpenAIClient } from './openai-client.js';
import { Logger } from '../utils/logger.js';
export class AnalysisEngine {
    constructor(redis, config) {
        Object.defineProperty(this, "openaiClient", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "redis", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "logger", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "cacheKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'ai_analysis_cache'
        });
        this.redis = redis;
        this.config = config;
        this.logger = new Logger(config.logLevel);
        if (config.openaiApiKey) {
            // Support OpenRouter and other OpenAI-compatible providers
            const baseURL = config.openaiBaseUrl || undefined;
            this.openaiClient = new OpenAIClient(config.openaiApiKey, config.openaiModel, baseURL);
        }
        else {
            this.logger.warn('OpenAI API key not provided, AI analysis will use fallback methods');
        }
    }
    async analyzeTodos(todos) {
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
        }
        catch (error) {
            this.logger.error('AI analysis failed, falling back to simple analysis:', error);
            return this.generateFallbackAnalysis(todos);
        }
    }
    async performAIAnalysis(todos) {
        if (!this.openaiClient) {
            throw new Error('OpenAI client not available');
        }
        try {
            const analysis = await this.openaiClient.analyzeTodos(todos);
            const response = {
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
        }
        catch (error) {
            this.logger.error('OpenAI analysis failed:', error);
            throw error;
        }
    }
    generateFallbackAnalysis(todos) {
        const analysis = todos.map((todo, index) => {
            // Simple priority based on creation time and status
            let priority = 5; // Default priority
            if (todo.status === 'completed') {
                priority = 1; // Completed todos have lowest priority
            }
            else {
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
    async getCachedAnalysis(todos) {
        try {
            const cacheKey = this.getCacheKey(todos);
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            this.logger.warn('Failed to get cached analysis:', error);
            return null;
        }
    }
    async cacheAnalysis(todos, analysis) {
        try {
            const cacheKey = this.getCacheKey(todos);
            const cacheData = JSON.stringify(analysis);
            await this.redis.set(cacheKey, cacheData, this.config.aiAnalysisCacheTtl);
            this.logger.debug('Analysis cached successfully');
        }
        catch (error) {
            this.logger.warn('Failed to cache analysis:', error);
        }
    }
    getCacheKey(todos) {
        // Create a hash of the todos for cache key
        const todoIds = todos.map(t => t.id).sort().join(',');
        const todoStatuses = todos.map(t => t.status).sort().join(',');
        return `${this.cacheKey}:${Buffer.from(todoIds + todoStatuses).toString('base64').slice(0, 16)}`;
    }
    async clearCache() {
        try {
            const pattern = `${this.cacheKey}:*`;
            const keys = await this.redis.keys(pattern);
            for (const key of keys) {
                await this.redis.del(key);
            }
            this.logger.info(`Cleared ${keys.length} cached analyses`);
        }
        catch (error) {
            this.logger.error('Failed to clear analysis cache:', error);
        }
    }
    isHealthy() {
        return this.openaiClient ? this.openaiClient.isHealthy() : true;
    }
    getStats() {
        // This would be implemented with proper metrics collection
        return {
            cacheHits: 0,
            cacheMisses: 0,
            aiCalls: 0
        };
    }
}
//# sourceMappingURL=analysis-engine.js.map