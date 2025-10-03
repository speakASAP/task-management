// State synchronization using Redis pub/sub
import { RedisClient } from '../redis/client.js';
import { Logger } from '../utils/logger.js';
import { StateSyncEvent } from '../types/index.js';

export class StateSync {
    private redis: RedisClient;
    private nodeId: string;
    private logger: Logger;
    private isInitialized: boolean = false;
    private channelName: string = 'todo-sync';

    constructor(redis: RedisClient, nodeId: string) {
        this.redis = redis;
        this.nodeId = nodeId;
        this.logger = new Logger();
    }

    public async initialize(): Promise<void> {
        try {
            // Create a separate Redis client for pub/sub to avoid conflicts
            const { createClient } = await import('redis');
            const pubSubClient = createClient({
                url: this.redis.getClient().options?.url || 'redis://localhost:6379'
            });

            await pubSubClient.connect();
            
            // Subscribe to state sync events
            await pubSubClient.subscribe(this.channelName, (message) => {
                this.handleSyncEvent(message);
            });

            this.isInitialized = true;
            this.logger.info(`State synchronization initialized for node ${this.nodeId}`);
        } catch (error) {
            this.logger.error('Failed to initialize state synchronization:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        try {
            if (this.isInitialized) {
                await this.redis.unsubscribe(this.channelName);
                this.isInitialized = false;
                this.logger.info('State synchronization stopped');
            }
        } catch (error) {
            this.logger.error('Error stopping state synchronization:', error);
        }
    }

    public async publishEvent(event: Omit<StateSyncEvent, 'nodeId' | 'timestamp'>): Promise<void> {
        try {
            const syncEvent: StateSyncEvent = {
                ...event,
                nodeId: this.nodeId,
                timestamp: new Date()
            };

            const message = JSON.stringify(syncEvent);
            
            // Use a separate Redis client for publishing
            const { createClient } = await import('redis');
            const publishClient = createClient({
                url: this.redis.getClient().options?.url || 'redis://localhost:6379'
            });

            await publishClient.connect();
            await publishClient.publish(this.channelName, message);
            await publishClient.disconnect();
            
            this.logger.debug(`Published sync event: ${event.type}`, { event });
        } catch (error) {
            this.logger.error('Failed to publish sync event:', error);
            throw error;
        }
    }

    private handleSyncEvent(message: string): void {
        try {
            const event: StateSyncEvent = JSON.parse(message);
            
            // Ignore events from the same node
            if (event.nodeId === this.nodeId) {
                return;
            }

            this.logger.debug(`Received sync event: ${event.type} from node ${event.nodeId}`, { event });

            // Handle different event types
            switch (event.type) {
                case 'todo_added':
                    this.handleTodoAdded(event);
                    break;
                case 'todo_updated':
                    this.handleTodoUpdated(event);
                    break;
                case 'todo_removed':
                    this.handleTodoRemoved(event);
                    break;
                case 'todo_cleared':
                    this.handleTodoCleared(event);
                    break;
                default:
                    this.logger.warn(`Unknown sync event type: ${event.type}`);
            }
        } catch (error) {
            this.logger.error('Failed to handle sync event:', error);
        }
    }

    private handleTodoAdded(event: StateSyncEvent): void {
        this.logger.info(`Todo added on node ${event.nodeId}: ${event.data?.name}`);
        // Additional handling can be added here if needed
        // For example, updating local cache or triggering notifications
    }

    private handleTodoUpdated(event: StateSyncEvent): void {
        this.logger.info(`Todo updated on node ${event.nodeId}: ${event.data?.id}`);
        // Additional handling can be added here if needed
    }

    private handleTodoRemoved(event: StateSyncEvent): void {
        this.logger.info(`Todo removed on node ${event.nodeId}: ${event.data?.id}`);
        // Additional handling can be added here if needed
    }

    private handleTodoCleared(event: StateSyncEvent): void {
        this.logger.info(`Todos cleared on node ${event.nodeId}`);
        // Additional handling can be added here if needed
    }

    public isReady(): boolean {
        return this.isInitialized;
    }

    public getNodeId(): string {
        return this.nodeId;
    }
}
