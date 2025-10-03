// OpenAI client wrapper with circuit breaker pattern
import OpenAI from 'openai';
import { Logger } from '../utils/logger.js';
import { AIConfig, Todo, TodoAnalysis } from '../types/index.js';

export class OpenAIClient {
    private client: OpenAI;
    private config: AIConfig;
    private logger: Logger;
    private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed';
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private readonly maxFailures: number = 3;
    private readonly timeoutMs: number = 30000;

    constructor(apiKey: string, model: string = 'gpt-3.5-turbo') {
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

    private isCircuitBreakerOpen(): boolean {
        if (this.circuitBreakerState === 'open') {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;
            if (timeSinceLastFailure > this.timeoutMs) {
                this.circuitBreakerState = 'half-open';
                this.logger.info('Circuit breaker moved to half-open state');
            }
        }
        return this.circuitBreakerState === 'open';
    }

    private recordSuccess(): void {
        this.failureCount = 0;
        this.circuitBreakerState = 'closed';
    }

    private recordFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.maxFailures) {
            this.circuitBreakerState = 'open';
            this.logger.warn('Circuit breaker opened due to repeated failures');
        }
    }

    public async analyzeTodos(todos: Todo[]): Promise<TodoAnalysis[]> {
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

            const analysis = this.parseAnalysisResponse(response.choices[0]?.message?.content || '');
            this.recordSuccess();
            
            return analysis;
        } catch (error) {
            this.recordFailure();
            this.logger.error('OpenAI API call failed:', error);
            throw error;
        }
    }

    private buildAnalysisPrompt(todos: Todo[]): string {
        const todoList = todos.map((todo, index) => 
            `${index + 1}. ${todo.name} (Status: ${todo.status}, Created: ${todo.createdAt.toISOString()})`
        ).join('\n');

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

    private parseAnalysisResponse(response: string): TodoAnalysis[] {
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
        } catch (error) {
            this.logger.error('Failed to parse AI analysis response:', error);
            // Return fallback analysis
            return this.generateFallbackAnalysis(response);
        }
    }

    private generateFallbackAnalysis(response: string): TodoAnalysis[] {
        // Generate a simple fallback analysis based on the response
        const lines = response.split('\n').filter(line => line.trim());
        return lines.map((line, index) => ({
            priority: Math.max(1, 10 - index),
            reasoning: `Fallback analysis: ${line.substring(0, 100)}...`,
            suggestedOrder: index + 1,
            estimatedImpact: index < 3 ? 'high' as const : index < 6 ? 'medium' as const : 'low' as const,
            tags: ['ai-analyzed'],
            createdAt: new Date()
        }));
    }

    public isHealthy(): boolean {
        return this.circuitBreakerState !== 'open';
    }

    public getCircuitBreakerState(): string {
        return this.circuitBreakerState;
    }

    public getFailureCount(): number {
        return this.failureCount;
    }
}
