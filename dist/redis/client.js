// Redis client wrapper with connection pooling and error handling
import { createClient } from 'redis';
import { Logger } from '../utils/logger.js';
export class RedisClient {
    constructor(redisUrl, poolSize = 10) {
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
        Object.defineProperty(this, "isConnected", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
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
    setupEventHandlers() {
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
    async connect() {
        try {
            if (!this.isConnected) {
                await this.client.connect();
                this.logger.info('Redis connection established');
            }
        }
        catch (error) {
            this.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            if (this.isConnected) {
                await this.client.quit();
                this.logger.info('Redis connection closed');
            }
        }
        catch (error) {
            this.logger.error('Error disconnecting from Redis:', error);
        }
    }
    async ping() {
        try {
            return await this.client.ping();
        }
        catch (error) {
            this.logger.error('Redis ping failed:', error);
            throw error;
        }
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            this.logger.error(`Redis GET failed for key ${key}:`, error);
            throw error;
        }
    }
    async set(key, value, ttl) {
        try {
            if (ttl) {
                await this.client.setEx(key, ttl, value);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (error) {
            this.logger.error(`Redis SET failed for key ${key}:`, error);
            throw error;
        }
    }
    async del(key) {
        try {
            return await this.client.del(key);
        }
        catch (error) {
            this.logger.error(`Redis DEL failed for key ${key}:`, error);
            throw error;
        }
    }
    async hGet(key, field) {
        try {
            const result = await this.client.hGet(key, field);
            return result || undefined;
        }
        catch (error) {
            this.logger.error(`Redis HGET failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }
    async hSet(key, field, value) {
        try {
            return await this.client.hSet(key, field, value);
        }
        catch (error) {
            this.logger.error(`Redis HSET failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }
    async hGetAll(key) {
        try {
            return await this.client.hGetAll(key);
        }
        catch (error) {
            this.logger.error(`Redis HGETALL failed for key ${key}:`, error);
            throw error;
        }
    }
    async hDel(key, field) {
        try {
            return await this.client.hDel(key, field);
        }
        catch (error) {
            this.logger.error(`Redis HDEL failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }
    async hExists(key, field) {
        try {
            const result = await this.client.hExists(key, field);
            return result > 0;
        }
        catch (error) {
            this.logger.error(`Redis HEXISTS failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }
    async keys(pattern) {
        try {
            return await this.client.keys(pattern);
        }
        catch (error) {
            this.logger.error(`Redis KEYS failed for pattern ${pattern}:`, error);
            throw error;
        }
    }
    async publish(channel, message) {
        try {
            return await this.client.publish(channel, message);
        }
        catch (error) {
            this.logger.error(`Redis PUBLISH failed for channel ${channel}:`, error);
            throw error;
        }
    }
    async subscribe(channel, callback) {
        try {
            await this.client.subscribe(channel, callback);
        }
        catch (error) {
            this.logger.error(`Redis SUBSCRIBE failed for channel ${channel}:`, error);
            throw error;
        }
    }
    async unsubscribe(channel) {
        try {
            await this.client.unsubscribe(channel);
        }
        catch (error) {
            this.logger.error(`Redis UNSUBSCRIBE failed for channel ${channel}:`, error);
            throw error;
        }
    }
    async sAdd(key, ...members) {
        try {
            return await this.client.sAdd(key, members);
        }
        catch (error) {
            this.logger.error(`Redis SADD failed for key ${key}:`, error);
            throw error;
        }
    }
    async sMembers(key) {
        try {
            return await this.client.sMembers(key);
        }
        catch (error) {
            this.logger.error(`Redis SMEMBERS failed for key ${key}:`, error);
            throw error;
        }
    }
    async sRem(key, ...members) {
        try {
            return await this.client.sRem(key, members);
        }
        catch (error) {
            this.logger.error(`Redis SREM failed for key ${key}:`, error);
            throw error;
        }
    }
    async hIncrBy(key, field, increment) {
        try {
            return await this.client.hIncrBy(key, field, increment);
        }
        catch (error) {
            this.logger.error(`Redis HINCRBY failed for key ${key}, field ${field}:`, error);
            throw error;
        }
    }
    isHealthy() {
        return this.isConnected;
    }
    getClient() {
        return this.client;
    }
}
//# sourceMappingURL=client.js.map