// Redis client wrapper with connection pooling and error handling
import { createClient, RedisClientType } from 'redis';
import { Logger } from '../utils/logger.js';
import { RedisConfig } from '../types/index.js';

export class RedisClient {
    private client: RedisClientType;
    private config: RedisConfig;
    private logger: Logger;
    private isConnected: boolean = false;

    constructor(redisUrl: string, poolSize: number = 10) {
        this.config = {
            url: redisUrl,
            poolSize,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true
        };
        
        this.logger = new Logger();
        this.client = createClient({
            url: this.config.url,
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > this.config.maxRetriesPerRequest) {
                        this.logger.error('Redis connection failed after max retries');
                        return new Error('Redis connection failed');
                    }
                    return Math.min(retries * this.config.retryDelayOnFailover, 3000);
                }
            }
        });

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            this.logger.info('Redis client connected');
            this.isConnected = true;
        });

        this.client.on('ready', () => {
            this.logger.info('Redis client ready');
        });

        this.client.on('error', (error) => {
            this.logger.error('Redis client error:', error);
            this.isConnected = false;
        });

        this.client.on('end', () => {
            this.logger.warn('Redis client connection ended');
            this.isConnected = false;
        });

        this.client.on('reconnecting', () => {
            this.logger.info('Redis client reconnecting...');
        });
    }

    public async connect(): Promise<void> {
        try {
            if (!this.isConnected) {
                await this.client.connect();
                this.logger.info('Redis connection established');
            }
        } catch (error) {
            this.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        try {
            if (this.isConnected) {
                await this.client.quit();
                this.logger.info('Redis connection closed');
            }
        } catch (error) {
            this.logger.error('Error disconnecting from Redis:', error);
        }
    }

    public async ping(): Promise<string> {
        try {
            return await this.client.ping();
        } catch (error) {
            this.logger.error('Redis ping failed:', error);
            throw error;
        }
    }

    public async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            this.logger.error(`Redis GET failed for key ${key}:`, error);
            throw error;
        }
    }

    public async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            if (ttl) {
                await this.client.setEx(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            this.logger.error(`Redis SET failed for key ${key}:`, error);
            throw error;
        }
    }

    public async del(key: string): Promise<number> {
        try {
            return await this.client.del(key);
        } catch (error) {
            this.logger.error(`Redis DEL failed for key ${key}:`, error);
            throw error;
        }
    }

    public async hGet(key: string, field: string): Promise<string | undefined> {
        try {
            const result = await this.client.hGet(key, field);
            return result || undefined;
        } catch (error) {
            this.logger.error(`Redis HGET failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }

    public async hSet(key: string, field: string, value: string): Promise<number> {
        try {
            return await this.client.hSet(key, field, value);
        } catch (error) {
            this.logger.error(`Redis HSET failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }

    public async hGetAll(key: string): Promise<Record<string, string>> {
        try {
            return await this.client.hGetAll(key);
        } catch (error) {
            this.logger.error(`Redis HGETALL failed for key ${key}:`, error);
            throw error;
        }
    }

    public async hDel(key: string, field: string): Promise<number> {
        try {
            return await this.client.hDel(key, field);
        } catch (error) {
            this.logger.error(`Redis HDEL failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }

    public async hExists(key: string, field: string): Promise<boolean> {
        try {
            const result = await this.client.hExists(key, field);
            return result > 0;
        } catch (error) {
            this.logger.error(`Redis HEXISTS failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }

    public async keys(pattern: string): Promise<string[]> {
        try {
            return await this.client.keys(pattern);
        } catch (error) {
            this.logger.error(`Redis KEYS failed for pattern ${pattern}:`, error);
            throw error;
        }
    }

    public async publish(channel: string, message: string): Promise<number> {
        try {
            return await this.client.publish(channel, message);
        } catch (error) {
            this.logger.error(`Redis PUBLISH failed for channel ${channel}:`, error);
            throw error;
        }
    }

    public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        try {
            await this.client.subscribe(channel, callback);
        } catch (error) {
            this.logger.error(`Redis SUBSCRIBE failed for channel ${channel}:`, error);
            throw error;
        }
    }

    public async unsubscribe(channel: string): Promise<void> {
        try {
            await this.client.unsubscribe(channel);
        } catch (error) {
            this.logger.error(`Redis UNSUBSCRIBE failed for channel ${channel}:`, error);
            throw error;
        }
    }

    public async sAdd(key: string, ...members: string[]): Promise<number> {
        try {
            return await this.client.sAdd(key, members);
        } catch (error) {
            this.logger.error(`Redis SADD failed for key ${key}:`, error);
            throw error;
        }
    }

    public async sMembers(key: string): Promise<string[]> {
        try {
            return await this.client.sMembers(key);
        } catch (error) {
            this.logger.error(`Redis SMEMBERS failed for key ${key}:`, error);
            throw error;
        }
    }

    public async sRem(key: string, ...members: string[]): Promise<number> {
        try {
            return await this.client.sRem(key, members);
        } catch (error) {
            this.logger.error(`Redis SREM failed for key ${key}:`, error);
            throw error;
        }
    }

    public async hIncrBy(key: string, field: string, increment: number): Promise<number> {
        try {
            return await this.client.hIncrBy(key, field, increment);
        } catch (error) {
            this.logger.error(`Redis HINCRBY failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }

    public isHealthy(): boolean {
        return this.isConnected;
    }

    public getClient(): RedisClientType {
        return this.client;
    }
}
