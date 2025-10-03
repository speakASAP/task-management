// MCP Tools registration and management
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TodoStorage } from '../storage/todo-storage.js';
import { StateSync } from '../sync/state-sync.js';
import { ServerConfig } from '../types/index.js';

export function registerTools(
    _server: Server, 
    _todoStorage: TodoStorage, 
    _stateSync: StateSync, 
    _config: ServerConfig
): void {
    // Tool registration is handled in the MCP server setup
    // This function can be extended to add custom tool logic if needed
}
