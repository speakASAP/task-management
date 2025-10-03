// main.ts
// MCP Server Todo Application entry point
import dotenv from 'dotenv';
import { MCPServer } from './mcp-server.js';
// Load environment variables
dotenv.config();
async function main() {
    try {
        const server = new MCPServer();
        await server.start();
        // Graceful shutdown handling
        process.on('SIGINT', async () => {
            console.log('\nReceived SIGINT, shutting down gracefully...');
            await server.stop();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\nReceived SIGTERM, shutting down gracefully...');
            await server.stop();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
main().catch(console.error);
//# sourceMappingURL=main.js.map