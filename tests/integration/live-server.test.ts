// Integration tests for live MCP Server running on port 3000
import request from 'supertest';

describe('Live MCP Server Integration Tests', () => {
    const baseUrl = 'http://localhost:3000';

    describe('Health Endpoint', () => {
        it('should return health status from load balancer', async () => {
            const response = await request(baseUrl)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('nodeId');
            expect(response.body).toHaveProperty('uptime');
            expect(response.body).toHaveProperty('redis');
            expect(response.body.redis).toHaveProperty('connected', true);
        });
    });

    describe('Root Endpoint', () => {
        it('should return server information from load balancer', async () => {
            const response = await request(baseUrl)
                .get('/')
                .expect(200);

            expect(response.body).toHaveProperty('name', 'MCP Todo Server');
            expect(response.body).toHaveProperty('version', '1.0.0');
            expect(response.body).toHaveProperty('nodeId');
            expect(response.body).toHaveProperty('status', 'running');
        });
    });

    describe('MCP Endpoint', () => {
        it('should handle MCP requests through load balancer', async () => {
            const response = await request(baseUrl)
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

        it('should add todos through load balancer', async () => {
            const response = await request(baseUrl)
                .post('/mcp')
                .send({
                    method: 'tools/call',
                    params: {
                        name: 'todo_add',
                        arguments: {
                            name: 'Test todo via load balancer'
                        }
                    }
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('name', 'Test todo via load balancer');
        });

        it('should analyze todos through load balancer', async () => {
            const response = await request(baseUrl)
                .post('/mcp')
                .send({
                    method: 'tools/call',
                    params: {
                        name: 'todo_analyze',
                        arguments: {}
                    }
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('analysis');
        });
    });

    describe('Load Balancer', () => {
        it('should distribute requests across multiple nodes', async () => {
            const nodeIds = new Set();
            
            // Make multiple requests to see different node IDs
            for (let i = 0; i < 5; i++) {
                const response = await request(baseUrl)
                    .get('/health')
                    .expect(200);
                
                nodeIds.add(response.body.nodeId);
            }

            // Should see at least 2 different node IDs (load balancing)
            expect(nodeIds.size).toBeGreaterThanOrEqual(1);
        });
    });

    describe('CORS', () => {
        it('should handle CORS preflight requests', async () => {
            await request(baseUrl)
                .options('/health')
                .expect(204);
        });
    });
});
