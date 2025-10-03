export declare class MCPServer {
    private server;
    private app;
    private config;
    private todoStorage;
    private redisClient;
    private stateSync;
    private logger;
    private startTime;
    constructor();
    private loadConfig;
    private setupExpress;
    private setupMCPServer;
    private handleMCPRequest;
    private getHealthStatus;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=mcp-server.d.ts.map