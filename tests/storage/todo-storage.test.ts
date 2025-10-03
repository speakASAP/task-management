// Unit tests for TodoStorage
import { TodoStorage } from '../../src/storage/todo-storage';
import { RedisClient } from '../../src/redis/client';
import { ServerConfig } from '../../src/types/index';

// Mock Redis client
jest.mock('../../src/redis/client');
const MockedRedisClient = RedisClient as jest.MockedClass<typeof RedisClient>;

describe('TodoStorage', () => {
    let todoStorage: TodoStorage;
    let mockRedis: jest.Mocked<RedisClient>;
    let config: ServerConfig;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock Redis client
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
            port: 3000,
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

    describe('addTodo', () => {
        it('should add a new todo successfully', async () => {
            const todoName = 'Test Todo';
            
            mockRedis.hSet.mockResolvedValue(1);
            mockRedis.sAdd.mockResolvedValue(1);
            mockRedis.hIncrBy.mockResolvedValue(1);

            const result = await todoStorage.addTodo(todoName);

            expect(result.success).toBe(true);
            expect(result.data).toMatchObject({
                name: todoName,
                status: 'pending'
            });
            expect(result.data?.id).toBeDefined();
            expect(mockRedis.hSet).toHaveBeenCalledTimes(6); // id, name, status, createdAt, updatedAt, plus cache invalidation
            expect(mockRedis.sAdd).toHaveBeenCalledWith('todos:test-session', expect.any(String));
        });

        it('should handle Redis errors gracefully', async () => {
            mockRedis.hSet.mockRejectedValue(new Error('Redis connection failed'));

            const result = await todoStorage.addTodo('Test Todo');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Redis connection failed');
        });
    });

    describe('listTodos', () => {
        it('should list all todos successfully', async () => {
            const mockTodos = [
                {
                    id: 'todo-1',
                    name: 'Todo 1',
                    status: 'pending',
                    createdAt: '2023-01-01T00:00:00.000Z',
                    updatedAt: '2023-01-01T00:00:00.000Z'
                },
                {
                    id: 'todo-2',
                    name: 'Todo 2',
                    status: 'completed',
                    createdAt: '2023-01-02T00:00:00.000Z',
                    updatedAt: '2023-01-02T00:00:00.000Z'
                }
            ];

            mockRedis.sMembers.mockResolvedValue(['todo-1', 'todo-2']);
            mockRedis.hGetAll
                .mockResolvedValueOnce(mockTodos[0])
                .mockResolvedValueOnce(mockTodos[1]);

            const result = await todoStorage.listTodos('all');

            expect(result.success).toBe(true);
            expect(result.data?.todos).toHaveLength(2);
            expect(result.data?.total).toBe(2);
            expect(result.data?.pending).toBe(1);
            expect(result.data?.completed).toBe(1);
        });

        it('should filter todos by status', async () => {
            const mockTodo = {
                id: 'todo-1',
                name: 'Todo 1',
                status: 'pending',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z'
            };

            mockRedis.sMembers.mockResolvedValue(['todo-1']);
            mockRedis.hGetAll.mockResolvedValue(mockTodo);

            const result = await todoStorage.listTodos('pending');

            expect(result.success).toBe(true);
            expect(result.data?.todos).toHaveLength(1);
            expect(result.data?.todos[0].status).toBe('pending');
        });

        it('should return cached results when available', async () => {
            const cachedData = {
                todos: [],
                total: 0,
                pending: 0,
                completed: 0
            };

            // First call - cache miss
            mockRedis.sMembers.mockResolvedValue([]);
            const result1 = await todoStorage.listTodos('all');
            expect(result1.data).toEqual(cachedData);

            // Second call - cache hit
            const result2 = await todoStorage.listTodos('all');
            expect(result2.data).toEqual(cachedData);
            expect(result2.message).toContain('cached');
        });
    });

    describe('removeTodo', () => {
        it('should remove a todo successfully', async () => {
            mockRedis.hExists.mockResolvedValue(true);
            mockRedis.del.mockResolvedValue(1);
            mockRedis.sRem.mockResolvedValue(1);
            mockRedis.hIncrBy.mockResolvedValue(0);

            const result = await todoStorage.removeTodo('todo-1');

            expect(result.success).toBe(true);
            expect(result.data).toBe(true);
            expect(mockRedis.del).toHaveBeenCalledWith('todo:test-session:todo-1');
            expect(mockRedis.sRem).toHaveBeenCalledWith('todos:test-session', 'todo-1');
        });

        it('should return error when todo does not exist', async () => {
            mockRedis.hExists.mockResolvedValue(false);

            const result = await todoStorage.removeTodo('nonexistent-todo');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Todo not found');
        });
    });

    describe('markTodoDone', () => {
        it('should mark a todo as completed successfully', async () => {
            const mockTodo = {
                id: 'todo-1',
                name: 'Todo 1',
                status: 'completed',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z'
            };

            mockRedis.hExists.mockResolvedValue(true);
            mockRedis.hSet.mockResolvedValue(1);
            mockRedis.hGetAll.mockResolvedValue(mockTodo);

            const result = await todoStorage.markTodoDone('todo-1');

            expect(result.success).toBe(true);
            expect(result.data?.status).toBe('completed');
            expect(mockRedis.hSet).toHaveBeenCalledWith('todo:test-session:todo-1', 'status', 'completed');
        });

        it('should return error when todo does not exist', async () => {
            mockRedis.hExists.mockResolvedValue(false);

            const result = await todoStorage.markTodoDone('nonexistent-todo');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Todo not found');
        });
    });

    describe('clearTodos', () => {
        it('should clear all todos successfully', async () => {
            mockRedis.sMembers.mockResolvedValue(['todo-1', 'todo-2']);
            mockRedis.del.mockResolvedValue(1);
            mockRedis.hSet.mockResolvedValue(1);

            const result = await todoStorage.clearTodos();

            expect(result.success).toBe(true);
            expect(result.data).toBe(2);
            expect(mockRedis.del).toHaveBeenCalledTimes(3); // 2 todos + todos list
        });
    });

    describe('analyzeTodos', () => {
        it('should analyze todos with fallback when AI is disabled', async () => {
            mockRedis.sMembers.mockResolvedValue(['todo-1']);
            mockRedis.hGetAll.mockResolvedValue({
                id: 'todo-1',
                name: 'Todo 1',
                status: 'pending',
                createdAt: '2023-01-01T00:00:00.000Z',
                updatedAt: '2023-01-01T00:00:00.000Z'
            });

            const result = await todoStorage.analyzeTodos();

            expect(result.success).toBe(true);
            expect(result.data?.analysis).toHaveLength(1);
            expect(result.data?.summary.totalAnalyzed).toBe(1);
            expect(result.message).toContain('AI analysis');
        });

        it('should return empty analysis when no todos exist', async () => {
            mockRedis.sMembers.mockResolvedValue([]);

            const result = await todoStorage.analyzeTodos();

            expect(result.success).toBe(true);
            expect(result.data?.analysis).toHaveLength(0);
            expect(result.data?.summary.totalAnalyzed).toBe(0);
        });
    });
});
