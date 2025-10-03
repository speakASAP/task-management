// Test setup and global configuration

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';
process.env.SERVER_PORT = '3001';
process.env.NODE_ID = 'test-node';

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
