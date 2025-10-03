// In-memory cache with LRU eviction
import { Logger } from '../utils/logger.js';
import { CacheConfig } from '../types/index.js';

interface CacheItem<T> {
    value: T;
    timestamp: number;
    accessCount: number;
    lastAccessed: number;
}

export class MemoryCache<T = any> {
    private cache: Map<string, CacheItem<T>> = new Map();
    private config: CacheConfig;
    private logger: Logger;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(config: CacheConfig) {
        this.config = {
            ttl: config.ttl || 600, // 10 minutes default
            maxSize: config.maxSize || 1000,
            checkPeriod: config.checkPeriod || 60 // 1 minute default
        };
        
        this.logger = new Logger();
        this.startCleanupTimer();
    }

    public set(key: string, value: T, _ttl?: number): void {
        const now = Date.now();
        // const itemTtl = ttl || this.config.ttl; // Currently unused but available for future use
        
        const item: CacheItem<T> = {
            value,
            timestamp: now,
            accessCount: 0,
            lastAccessed: now
        };

        // If cache is full, remove least recently used item
        if (this.cache.size >= this.config.maxSize) {
            this.evictLRU();
        }

        this.cache.set(key, item);
        this.logger.debug(`Cached item: ${key}`);
    }

    public get(key: string): T | null {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        const now = Date.now();
        
        // Check if item has expired
        if (now - item.timestamp > this.config.ttl * 1000) {
            this.cache.delete(key);
            this.logger.debug(`Cache item expired: ${key}`);
            return null;
        }

        // Update access statistics
        item.accessCount++;
        item.lastAccessed = now;
        
        this.logger.debug(`Cache hit: ${key}`);
        return item.value;
    }

    public has(key: string): boolean {
        return this.get(key) !== null;
    }

    public delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.logger.debug(`Cache item deleted: ${key}`);
        }
        return deleted;
    }

    public clear(): void {
        this.cache.clear();
        this.logger.info('Cache cleared');
    }

    public size(): number {
        return this.cache.size;
    }

    public keys(): string[] {
        return Array.from(this.cache.keys());
    }

    public getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        oldestItem: number;
        newestItem: number;
    } {
        const now = Date.now();
        let totalAccessCount = 0;
        let oldestTimestamp = now;
        let newestTimestamp = 0;

        for (const item of this.cache.values()) {
            totalAccessCount += item.accessCount;
            oldestTimestamp = Math.min(oldestTimestamp, item.timestamp);
            newestTimestamp = Math.max(newestTimestamp, item.timestamp);
        }

        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hitRate: this.cache.size > 0 ? totalAccessCount / this.cache.size : 0,
            oldestItem: now - oldestTimestamp,
            newestItem: now - newestTimestamp
        };
    }

    private evictLRU(): void {
        let lruKey = '';
        let lruScore = Infinity;

        for (const [key, item] of this.cache.entries()) {
            // Calculate LRU score (lower is better)
            // Consider both access count and last accessed time
            const score = item.accessCount * 0.3 + (Date.now() - item.lastAccessed) * 0.7;
            
            if (score < lruScore) {
                lruScore = score;
                lruKey = key;
            }
        }

        if (lruKey) {
            this.cache.delete(lruKey);
            this.logger.debug(`Evicted LRU item: ${lruKey}`);
        }
    }

    private startCleanupTimer(): void {
        this.checkInterval = setInterval(() => {
            this.cleanup();
        }, this.config.checkPeriod * 1000);
    }

    private cleanup(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, item] of this.cache.entries()) {
            if (now - item.timestamp > this.config.ttl * 1000) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
        }

        if (expiredKeys.length > 0) {
            this.logger.debug(`Cleaned up ${expiredKeys.length} expired cache items`);
        }
    }

    public destroy(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.cache.clear();
        this.logger.info('Memory cache destroyed');
    }
}
