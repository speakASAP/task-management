// OpenAI client wrapper with circuit breaker pattern
import OpenAI from 'openai';
import { Logger } from '../utils/logger.js';
export class OpenAIClient {
    constructor(apiKey, model = 'gpt-3.5-turbo') {
        Object.defineProperty(this, "client", {
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
        Object.defineProperty(this, "circuitBreakerState", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'closed'
        });
        Object.defineProperty(this, "failureCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "lastFailureTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "maxFailures", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3
        });
        Object.defineProperty(this, "timeoutMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 30000
        });
        this.config = {
            apiKey,
            model,
            maxTokens: 1000,
            temperature: 0.7,
            timeout: 30000,
            retries: 3
        };
        this.client = new OpenAI({
            apiKey: this.config.apiKey,
            timeout: this.config.timeout
        });
        this.logger = new Logger();
    }
    isCircuitBreakerOpen() {
        if (this.circuitBreakerState === 'open') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure > this.timeoutMs) {
                this.circuitBreakerState = 'half-open';
                this.logger.info('Circuit breaker moved to half-open state');
            }
        }
        return this.circuitBreakerState === 'open';
    }
    recordSuccess() {
        this.failureCount = 0;
        this.circuitBreakerState = 'closed';
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.maxFailures) {
            this.circuitBreakerState = 'open';
            this.logger.warn('Circuit breaker opened due to repeated failures');
        }
    }
    async analyzeTodos(todos) {
        var _a, _b;
        if (this.isCircuitBreakerOpen()) {
            throw new Error('AI service is temporarily unavailable (circuit breaker open)');
        }
        try {
            const prompt = this.buildAnalysisPrompt(todos);
            const response = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI assistant that helps prioritize tasks. Analyze the given todos and provide priority scores, reasoning, and impact estimates.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });
            const analysis = this.parseAnalysisResponse(((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '');
            this.recordSuccess();
            return analysis;
        }
        catch (error) {
            this.recordFailure();
            this.logger.error('OpenAI API call failed:', error);
            throw error;
        }
    }
    buildAnalysisPrompt(todos) {
        const todoList = todos.map((todo, index) => `${index + 1}. ${todo.name} (Status: ${todo.status}, Created: ${todo.createdAt.toISOString()})`).join('\n');
        return `Please analyze the following todo items and provide priority scores, reasoning, and impact estimates for each:

${todoList}

For each todo, provide:
1. Priority score (1-10, where 10 is highest priority)
2. Reasoning for the priority score
3. Suggested order (1-based ranking)
4. Estimated impact (low/medium/high)
5. Relevant tags (array of strings)

Respond with a JSON array where each object has:
{
  "priority": number,
  "reasoning": string,
  "suggestedOrder": number,
  "estimatedImpact": "low" | "medium" | "high",
  "tags": string[]
}

Consider factors like:
- Urgency and deadlines
- Dependencies between tasks
- Business value and impact
- Effort required
- Current status (pending vs completed)`;
    }
    parseAnalysisResponse(response) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }
            const analysis = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(analysis)) {
                throw new Error('Response is not an array');
            }
            return analysis.map((item, index) => ({
                priority: Math.max(1, Math.min(10, item.priority || 5)),
                reasoning: item.reasoning || 'No reasoning provided',
                suggestedOrder: item.suggestedOrder || index + 1,
                estimatedImpact: ['low', 'medium', 'high'].includes(item.estimatedImpact)
                    ? item.estimatedImpact
                    : 'medium',
                tags: Array.isArray(item.tags) ? item.tags : ['general'],
                createdAt: new Date()
            }));
        }
        catch (error) {
            this.logger.error('Failed to parse AI analysis response:', error);
            // Return fallback analysis
            return this.generateFallbackAnalysis(response);
        }
    }
    generateFallbackAnalysis(response) {
        // Generate a simple fallback analysis based on the response
        const lines = response.split('\n').filter(line => line.trim());
        return lines.map((line, index) => ({
            priority: Math.max(1, 10 - index),
            reasoning: `Fallback analysis: ${line.substring(0, 100)}...`,
            suggestedOrder: index + 1,
            estimatedImpact: index < 3 ? 'high' : index < 6 ? 'medium' : 'low',
            tags: ['ai-analyzed'],
            createdAt: new Date()
        }));
    }
    isHealthy() {
        return this.circuitBreakerState !== 'open';
    }
    getCircuitBreakerState() {
        return this.circuitBreakerState;
    }
    getFailureCount() {
        return this.failureCount;
    }
}
//# sourceMappingURL=openai-client.js.map