// Test setup and global configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.SERVER_PORT = process.env.NODE_1_PORT || '3301';
process.env.NODE_1_ID = 'test-node';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global cleanup after all tests
afterAll(async () => {
  // Force close any remaining handles
  if (global.gc) {
    global.gc();
  }
  
  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Clean up after each test to prevent memory leaks
afterEach(() => {
  // Clear any timers that might be running
  jest.clearAllTimers();
});
