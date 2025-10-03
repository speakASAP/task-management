// Integration tests for MCP Server
import request from 'supertest';
import { MCPServer } from '../../src/mcp-server';

// Mock Redis client
jest.mock('../../src/redis/client');
jest.mock('../../src/ai/analysis-engine');

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
        await server.stop();
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
                .send({})
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message');
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
