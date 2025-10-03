import { Logger } from '../utils/logger.js';
export class StateSync {
    constructor(redis, nodeId) {
        Object.defineProperty(this, "redis", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "nodeId", {
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
        Object.defineProperty(this, "isInitialized", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "channelName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'todo-sync'
        });
        this.redis = redis;
        this.nodeId = nodeId;
        this.logger = new Logger();
    }
    async initialize() {
        var _a;
        try {
            // Create a separate Redis client for pub/sub to avoid conflicts
            const { createClient } = await import('redis');
            const pubSubClient = createClient({
                url: ((_a = this.redis.getClient().options) === null || _a === void 0 ? void 0 : _a.url) || 'redis://localhost:6379'
            });
            await pubSubClient.connect();
            // Subscribe to state sync events
            await pubSubClient.subscribe(this.channelName, (message) => {
                this.handleSyncEvent(message);
            });
            this.isInitialized = true;
            this.logger.info(`State synchronization initialized for node ${this.nodeId}`);
        }
        catch (error) {
            this.logger.error('Failed to initialize state synchronization:', error);
            throw error;
        }
    }
    async stop() {
        try {
            if (this.isInitialized) {
                await this.redis.unsubscribe(this.channelName);
                this.isInitialized = false;
                this.logger.info('State synchronization stopped');
            }
        }
        catch (error) {
            this.logger.error('Error stopping state synchronization:', error);
        }
    }
    async publishEvent(event) {
        var _a;
        try {
            const syncEvent = {
                ...event,
                nodeId: this.nodeId,
                timestamp: new Date()
            };
            const message = JSON.stringify(syncEvent);
            // Use a separate Redis client for publishing
            const { createClient } = await import('redis');
            const publishClient = createClient({
                url: ((_a = this.redis.getClient().options) === null || _a === void 0 ? void 0 : _a.url) || 'redis://localhost:6379'
            });
            await publishClient.connect();
            await publishClient.publish(this.channelName, message);
            await publishClient.disconnect();
            this.logger.debug(`Published sync event: ${event.type}`, { event });
        }
        catch (error) {
            this.logger.error('Failed to publish sync event:', error);
            throw error;
        }
    }
    handleSyncEvent(message) {
        try {
            const event = JSON.parse(message);
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
        }
        catch (error) {
            this.logger.error('Failed to handle sync event:', error);
        }
    }
    handleTodoAdded(event) {
        var _a;
        this.logger.info(`Todo added on node ${event.nodeId}: ${(_a = event.data) === null || _a === void 0 ? void 0 : _a.name}`);
        // Additional handling can be added here if needed
        // For example, updating local cache or triggering notifications
    }
    handleTodoUpdated(event) {
        var _a;
        this.logger.info(`Todo updated on node ${event.nodeId}: ${(_a = event.data) === null || _a === void 0 ? void 0 : _a.id}`);
        // Additional handling can be added here if needed
    }
    handleTodoRemoved(event) {
        var _a;
        this.logger.info(`Todo removed on node ${event.nodeId}: ${(_a = event.data) === null || _a === void 0 ? void 0 : _a.id}`);
        // Additional handling can be added here if needed
    }
    handleTodoCleared(event) {
        this.logger.info(`Todos cleared on node ${event.nodeId}`);
        // Additional handling can be added here if needed
    }
    isReady() {
        return this.isInitialized;
    }
    getNodeId() {
        return this.nodeId;
    }
}
//# sourceMappingURL=state-sync.js.map