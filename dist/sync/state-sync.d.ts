import { RedisClient } from '../redis/client.js';
import { StateSyncEvent } from '../types/index.js';
export declare class StateSync {
    private redis;
    private nodeId;
    private logger;
    private isInitialized;
    private channelName;
    constructor(redis: RedisClient, nodeId: string);
    initialize(): Promise<void>;
    stop(): Promise<void>;
    publishEvent(event: Omit<StateSyncEvent, 'nodeId' | 'timestamp'>): Promise<void>;
    private handleSyncEvent;
    private handleTodoAdded;
    private handleTodoUpdated;
    private handleTodoRemoved;
    private handleTodoCleared;
    isReady(): boolean;
    getNodeId(): string;
}
//# sourceMappingURL=state-sync.d.ts.map