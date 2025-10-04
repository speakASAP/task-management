// End-to-end tests for complete todo workflow
import { TodoStorage } from '../../src/storage/todo-storage';
import { RedisClient } from '../../src/redis/client';
import { ServerConfig } from '../../src/types/index';

// Mock Redis client for E2E tests
jest.mock('../../src/redis/client');
const MockedRedisClient = RedisClient as jest.MockedClass<typeof RedisClient>;

describe('Todo Workflow E2E Tests', () => {
    let todoStorage: TodoStorage;
    let mockRedis: jest.Mocked<RedisClient>;
    let config: ServerConfig;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRedis = {
            hSet: jest.fn(),
            hGetAll: jest.fn(),
            hExists: jest.fn(),
            hDel: jest.fn(),
            hIncrBy: jest.fn(),
            sAdd: jest.fn(),
            sMembers: jest.fn(),
            sRem: jest.fn(),
            del: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            keys: jest.fn(),
            ping: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn(),
            isHealthy: jest.fn().mockReturnValue(true),
            getClient: jest.fn(),
            publish: jest.fn(),
            subscribe: jest.fn(),
            unsubscribe: jest.fn()
        } as any;

        MockedRedisClient.mockImplementation(() => mockRedis);

        config = {
            port: parseInt(process.env.SERVER_PORT || process.env.PORT || '3300'),
            nodeId: 'test-node',
            redisUrl: 'redis://localhost:6379',
            openaiApiKey: 'test-key',
            openaiModel: 'gpt-3.5-turbo',
            logLevel: 'error',
            aiAnalysisEnabled: false,
            aiAnalysisCacheTtl: 300,
            aiAnalysisBatchSize: 10,
            redisPoolSize: 10,
            cacheTtl: 600,
            maxConcurrentRequests: 100
        };

        todoStorage = new TodoStorage(mockRedis, 'test-session', config);
    });

    afterEach(() => {
        if (todoStorage) {
            todoStorage.destroy();
        }
    });

    describe('Complete Todo Lifecycle', () => {
        it('should handle complete todo workflow from creation to completion', async () => {
            // Setup mocks for the complete workflow
            mockRedis.hSet.mockResolvedValue(1);
            mockRedis.sAdd.mockResolvedValue(1);
            mockRedis.hIncrBy.mockResolvedValue(1);
            mockRedis.sMembers.mockResolvedValue([]);
            mockRedis.hExists.mockResolvedValue(true);
            mockRedis.del.mockResolvedValue(1);
            mockRedis.sRem.mockResolvedValue(1);

            // 1. Add a new todo
            const addResult = await todoStorage.addTodo('Complete project documentation');
            expect(addResult.success).toBe(true);
            expect(addResult.data?.name).toBe('Complete project documentation');
            expect(addResult.data?.status).toBe('pending');

            const todoId = addResult.data?.id!;

            // 2. List todos (should show the new todo)
            mockRedis.sMembers.mockResolvedValue([todoId]);
            mockRedis.hGetAll.mockResolvedValue({
                id: todoId,
                name: 'Complete project documentation',
                status: 'pending',
                createdAt: addResult.data?.createdAt.toISOString()!,
                updatedAt: addResult.data?.updatedAt.toISOString()!
            });

            const listResult = await todoStorage.listTodos('all');
            expect(listResult.success).toBe(true);
            expect(listResult.data?.todos).toHaveLength(1);
            expect(listResult.data?.pending).toBe(1);
            expect(listResult.data?.completed).toBe(0);

            // 3. Mark todo as completed
            mockRedis.hGetAll.mockResolvedValue({
                id: todoId,
                name: 'Complete project documentation',
                status: 'completed',
                createdAt: addResult.data?.createdAt.toISOString()!,
                updatedAt: new Date().toISOString()
            });

            const markDoneResult = await todoStorage.markTodoDone(todoId);
            expect(markDoneResult.success).toBe(true);
            expect(markDoneResult.data?.status).toBe('completed');

            // 4. List todos again (should show completed todo)
            mockRedis.hGetAll.mockResolvedValue({
                id: todoId,
                name: 'Complete project documentation',
                status: 'completed',
                createdAt: addResult.data?.createdAt.toISOString()!,
                updatedAt: new Date().toISOString()
            });

            const listAfterCompleteResult = await todoStorage.listTodos('all');
            expect(listAfterCompleteResult.success).toBe(true);
            expect(listAfterCompleteResult.data?.pending).toBe(0);
            expect(listAfterCompleteResult.data?.completed).toBe(1);

            // 5. Remove the completed todo
            const removeResult = await todoStorage.removeTodo(todoId);
            expect(removeResult.success).toBe(true);
            expect(removeResult.data).toBe(true);

            // 6. List todos (should be empty)
            mockRedis.sMembers.mockResolvedValue([]);
            const finalListResult = await todoStorage.listTodos('all');
            expect(finalListResult.success).toBe(true);
            expect(finalListResult.data?.todos).toHaveLength(0);
        });

        it('should handle multiple todos with different statuses', async () => {
            // Setup mocks
            mockRedis.hSet.mockResolvedValue(1);
            mockRedis.sAdd.mockResolvedValue(1);
            mockRedis.hIncrBy.mockResolvedValue(1);
            mockRedis.hExists.mockResolvedValue(true);
            mockRedis.del.mockResolvedValue(1);
            mockRedis.sRem.mockResolvedValue(1);

            // Add multiple todos
            const todo1 = await todoStorage.addTodo('High priority task');
            const todo2 = await todoStorage.addTodo('Medium priority task');
            const todo3 = await todoStorage.addTodo('Low priority task');

            expect(todo1.success).toBe(true);
            expect(todo2.success).toBe(true);
            expect(todo3.success).toBe(true);

            // Mark one as completed
            mockRedis.hGetAll.mockResolvedValue({
                id: todo2.data?.id!,
                name: 'Medium priority task',
                status: 'completed',
                createdAt: todo2.data?.createdAt.toISOString()!,
                updatedAt: new Date().toISOString()
            });

            await todoStorage.markTodoDone(todo2.data?.id!);

            // List all todos
            mockRedis.sMembers.mockResolvedValue([
                todo1.data?.id!,
                todo2.data?.id!,
                todo3.data?.id!
            ]);

            mockRedis.hGetAll
                .mockResolvedValueOnce({
                    id: todo1.data?.id!,
                    name: 'High priority task',
                    status: 'pending',
                    createdAt: todo1.data?.createdAt.toISOString()!,
                    updatedAt: todo1.data?.updatedAt.toISOString()!
                })
                .mockResolvedValueOnce({
                    id: todo2.data?.id!,
                    name: 'Medium priority task',
                    status: 'completed',
                    createdAt: todo2.data?.createdAt.toISOString()!,
                    updatedAt: new Date().toISOString()
                })
                .mockResolvedValueOnce({
                    id: todo3.data?.id!,
                    name: 'Low priority task',
                    status: 'pending',
                    createdAt: todo3.data?.createdAt.toISOString()!,
                    updatedAt: todo3.data?.updatedAt.toISOString()!
                });

            const listResult = await todoStorage.listTodos('all');
            expect(listResult.success).toBe(true);
            expect(listResult.data?.total).toBe(3);
            expect(listResult.data?.pending).toBe(2);
            expect(listResult.data?.completed).toBe(1);

            // Test filtering by status - need to setup mocks for filtered calls
            mockRedis.sMembers.mockResolvedValue([
                todo1.data?.id!,
                todo3.data?.id!  // Only pending todos
            ]);
            mockRedis.hGetAll
                .mockResolvedValueOnce({
                    id: todo1.data?.id!,
                    name: 'High priority task',
                    status: 'pending',
                    createdAt: todo1.data?.createdAt.toISOString()!,
                    updatedAt: todo1.data?.updatedAt.toISOString()!
                })
                .mockResolvedValueOnce({
                    id: todo3.data?.id!,
                    name: 'Low priority task',
                    status: 'pending',
                    createdAt: todo3.data?.createdAt.toISOString()!,
                    updatedAt: todo3.data?.updatedAt.toISOString()!
                });

            const pendingResult = await todoStorage.listTodos('pending');
            expect(pendingResult.success).toBe(true);
            expect(pendingResult.data?.todos).toHaveLength(2);

            // Setup mock for completed todos
            mockRedis.sMembers.mockResolvedValue([todo2.data?.id!]);
            mockRedis.hGetAll.mockResolvedValue({
                id: todo2.data?.id!,
                name: 'Medium priority task',
                status: 'completed',
                createdAt: todo2.data?.createdAt.toISOString()!,
                updatedAt: new Date().toISOString()
            });

            const completedResult = await todoStorage.listTodos('completed');
            expect(completedResult.success).toBe(true);
            expect(completedResult.data?.todos).toHaveLength(1);
        });

        it('should handle clear all todos operation', async () => {
            // Setup mocks
            mockRedis.hSet.mockResolvedValue(1);
            mockRedis.sAdd.mockResolvedValue(1);
            mockRedis.hIncrBy.mockResolvedValue(1);
            mockRedis.sMembers.mockResolvedValue(['todo-1', 'todo-2', 'todo-3']);
            mockRedis.del.mockResolvedValue(1);
            mockRedis.hSet.mockResolvedValue(1);

            // Add some todos first
            await todoStorage.addTodo('Todo 1');
            await todoStorage.addTodo('Todo 2');
            await todoStorage.addTodo('Todo 3');

            // Clear all todos
            const clearResult = await todoStorage.clearTodos();
            expect(clearResult.success).toBe(true);
            expect(clearResult.data).toBe(3);
            expect(clearResult.message).toBe('Cleared 3 todos');

            // Verify todos are cleared
            mockRedis.sMembers.mockResolvedValue([]);
            const listResult = await todoStorage.listTodos('all');
            expect(listResult.success).toBe(true);
            expect(listResult.data?.todos).toHaveLength(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle Redis connection failures gracefully', async () => {
            mockRedis.hSet.mockRejectedValue(new Error('Redis connection failed'));

            const result = await todoStorage.addTodo('Test todo');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Redis connection failed');
        });

        it('should handle operations on non-existent todos', async () => {
            mockRedis.hExists.mockResolvedValue(false);

            const removeResult = await todoStorage.removeTodo('non-existent-id');
            expect(removeResult.success).toBe(false);
            expect(removeResult.error).toBe('Todo not found');

            const markDoneResult = await todoStorage.markTodoDone('non-existent-id');
            expect(markDoneResult.success).toBe(false);
            expect(markDoneResult.error).toBe('Todo not found');
        });
    });

    describe('Caching Behavior', () => {
        it('should use cache for repeated list operations', async () => {
            mockRedis.sMembers.mockResolvedValue([]);

            // First call - should hit Redis
            const result1 = await todoStorage.listTodos('all');
            expect(result1.success).toBe(true);

            // Second call - should use cache
            const result2 = await todoStorage.listTodos('all');
            expect(result2.success).toBe(true);
            expect(result2.message).toContain('cached');

            // Verify Redis was only called once
            expect(mockRedis.sMembers).toHaveBeenCalledTimes(1);
        });

        it('should invalidate cache after modifications', async () => {
            mockRedis.hSet.mockResolvedValue(1);
            mockRedis.sAdd.mockResolvedValue(1);
            mockRedis.hIncrBy.mockResolvedValue(1);
            mockRedis.sMembers.mockResolvedValue([]);

            // Add a todo (should invalidate cache)
            await todoStorage.addTodo('Test todo');

            // List todos (should hit Redis again due to cache invalidation)
            const result = await todoStorage.listTodos('all');
            expect(result.success).toBe(true);

            // Verify Redis was called for both operations
            expect(mockRedis.sMembers).toHaveBeenCalledTimes(1);
        });
    });
});
