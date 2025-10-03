// Integration tests for MCP Server
import request from 'supertest';
import { MCPServer } from '../../src/mcp-server';

// Mock Redis client
jest.mock('../../src/redis/client');
jest.mock('../../src/ai/analysis-engine');

// Mock Redis client implementation
const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isHealthy: jest.fn().mockReturnValue(true),
    getClient: jest.fn().mockReturnValue({
        options: {
            url: 'redis://localhost:6379'
        }
    }),
    hSet: jest.fn().mockResolvedValue(1),
    hGetAll: jest.fn().mockResolvedValue({}),
    hExists: jest.fn().mockResolvedValue(false),
    hDel: jest.fn().mockResolvedValue(1),
    hIncrBy: jest.fn().mockResolvedValue(1),
    sAdd: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
    sRem: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    publish: jest.fn().mockResolvedValue(1),
    subscribe: jest.fn().mockResolvedValue(undefined),
    unsubscribe: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../../src/redis/client', () => ({
    RedisClient: jest.fn().mockImplementation(() => mockRedisClient)
}));

describe('MCP Server Integration Tests', () => {
    let server: MCPServer;
    let app: any;

    beforeAll(async () => {
        // Set test environment variables
        process.env.NODE_ENV = 'test';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.OPENAI_API_KEY = 'test-key';
        process.env.SERVER_PORT = '3001';
        process.env.NODE_ID = 'test-node';

        server = new MCPServer();
        await server.start();
        
        // Get the Express app for testing
        app = (server as any).app;
    });

    afterAll(async () => {
        try {
            if (server) {
                await server.stop();
            }
        } catch (error) {
            // Ignore cleanup errors
        }
        
        // Force cleanup of any remaining handles
        await new Promise(resolve => setTimeout(resolve, 100));
    });

    describe('Health Endpoint', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('nodeId', 'test-node');
            expect(response.body).toHaveProperty('uptime');
        });
    });

    describe('Root Endpoint', () => {
        it('should return server information', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);

            expect(response.body).toHaveProperty('name', 'MCP Todo Server');
            expect(response.body).toHaveProperty('version', '1.0.0');
            expect(response.body).toHaveProperty('nodeId', 'test-node');
            expect(response.body).toHaveProperty('status', 'running');
        });
    });

    describe('MCP Endpoint', () => {
        it('should handle MCP requests', async () => {
            const response = await request(app)
                .post('/mcp')
                .send({
                    method: 'tools/call',
                    params: {
                        name: 'todo_list',
                        arguments: {}
                    }
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
        });
    });

    describe('CORS', () => {
        it('should handle CORS preflight requests', async () => {
            await request(app)
                .options('/health')
                .expect(204);
        });
    });
});
