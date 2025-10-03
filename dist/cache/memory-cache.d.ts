import { CacheConfig } from '../types/index.js';
export declare class MemoryCache<T = any> {
    private cache;
    private config;
    private logger;
    private checkInterval;
    constructor(config: CacheConfig);
    set(key: string, value: T, _ttl?: number): void;
    get(key: string): T | null;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    getStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
        oldestItem: number;
        newestItem: number;
    };
    private evictLRU;
    private startCleanupTimer;
    private cleanup;
    destroy(): void;
}
//# sourceMappingURL=memory-cache.d.ts.map