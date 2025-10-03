import { RedisClientType } from 'redis';
export declare class RedisClient {
    private client;
    private config;
    private logger;
    private isConnected;
    constructor(redisUrl: string, poolSize?: number);
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    ping(): Promise<string>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<void>;
    del(key: string): Promise<number>;
    hGet(key: string, field: string): Promise<string | undefined>;
    hSet(key: string, field: string, value: string): Promise<number>;
    hGetAll(key: string): Promise<Record<string, string>>;
    hDel(key: string, field: string): Promise<number>;
    hExists(key: string, field: string): Promise<boolean>;
    keys(pattern: string): Promise<string[]>;
    publish(channel: string, message: string): Promise<number>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
    unsubscribe(channel: string): Promise<void>;
    sAdd(key: string, ...members: string[]): Promise<number>;
    sMembers(key: string): Promise<string[]>;
    sRem(key: string, ...members: string[]): Promise<number>;
    hIncrBy(key: string, field: string, increment: number): Promise<number>;
    isHealthy(): boolean;
    getClient(): RedisClientType;
}
//# sourceMappingURL=client.d.ts.map