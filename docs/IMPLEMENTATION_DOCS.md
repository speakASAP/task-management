# MCP Todo Server

A unified todo management server built with the Model Context Protocol (MCP) that provides intelligent task management with both MCP protocol support and web UI interface.

## 🚀 Features

- **Unified Server**: Single server providing both MCP protocol and HTTP API
- **MCP Protocol Support**: Full Model Context Protocol implementation for AI agent integration
- **Web UI Interface**: Modern web interface for task management
- **SQLite Storage**: No external dependencies - uses SQLite for data persistence
- **AI-Powered Analysis**: OpenAI/OpenRouter integration for intelligent task prioritization
- **Session Management**: Project-based todo organization
- **Health Monitoring**: Comprehensive health checks and monitoring

## 🛠️ MCP Tools

The server exposes the following MCP tools:

- `todo_add(name)` - Add a new todo item
- `todo_list(status?)` - List all todos (optionally filter by status)
- `todo_remove(id)` - Remove a todo by ID
- `todo_mark_done(id)` - Mark a todo as completed
- `todo_clear()` - Clear all todos
- `todo_analyze()` - AI-powered task analysis and prioritization

## 🏗️ Architecture

### Core Components

- **Todo Server**: Main server implementing both MCP protocol and HTTP API
- **Todo Storage**: SQLite-based storage with no external dependencies
- **AI Analysis Engine**: OpenAI/OpenRouter integration with circuit breaker pattern
- **Web Server**: Express-based web interface for task management
- **Session Management**: Project-based todo organization

### Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **MCP SDK**: @modelcontextprotocol/sdk
- **Storage**: SQLite (better-sqlite3)
- **Web Framework**: Express.js
- **AI Provider**: OpenAI API / OpenRouter
- **Frontend**: Vanilla HTML/CSS/JavaScript

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Redis (or use Docker)
- OpenAI API key (optional, fallback analysis available)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd mcp-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start with Docker Compose**

   ```bash
   docker-compose up -d
   ```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=production
SERVER_PORT=3300
NODE_1_PORT=3301
NODE_2_PORT=3302
NODE_1_ID=node-1
NODE_2_ID=node-2

# Base URL Configuration
BASE_URL=http://localhost
MCP_SERVER_URL=http://localhost:3300

# Redis Configuration
REDIS_URL=redis://redis:6379

# OpenAI Configuration (optional)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Logging
LOG_LEVEL=DEBUG

# AI Analysis Configuration
AI_ANALYSIS_ENABLED=true
AI_ANALYSIS_CACHE_TTL=300
AI_ANALYSIS_BATCH_SIZE=10

# Performance Configuration
REDIS_POOL_SIZE=10
CACHE_TTL=600
MAX_CONCURRENT_REQUESTS=100
```

## 🐳 Docker Deployment

### Single Node

```bash
# Build and run
docker build -t mcp-todo-server .
docker run -p 3300:3300 -e REDIS_URL=redis://host.docker.internal:6379 mcp-todo-server
```

### Multi-Node Setup

```bash
# Start the complete stack
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

The multi-node setup includes:

- 2 MCP server instances (ports 3301, 3302)
- Redis instance (port 6379)
- Caddy load balancer (port 3300)

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Returns server health status including Redis connectivity and AI service availability.

### MCP Endpoint

```bash
POST /mcp
```

Main MCP protocol endpoint for tool execution.

### Server Info

```bash
GET /
```

Returns basic server information and status.

## 🔧 Development

### Local Development

1. **Start Redis**

   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run in development mode**

   ```bash
   npm run dev
   ```

4. **Build for production**

   ```bash
   npm run build
   npm start
   ```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🤖 AI Analysis

The application includes intelligent task analysis powered by OpenAI:

- **Priority Scoring**: AI-generated priority scores (1-10, where 1 = highest priority, 10 = lowest priority)
- **Impact Assessment**: Low/Medium/High impact classification
- **Reasoning**: Detailed explanations for prioritization decisions
- **Caching**: Intelligent caching to reduce API calls
- **Fallback**: Graceful degradation when AI is unavailable

### AI Analysis Features

- Context-aware analysis based on existing todos
- Batch processing for efficiency
- Circuit breaker pattern for reliability
- Configurable caching and rate limiting

## 🔄 State Synchronization

The multi-node architecture ensures consistent state across all instances:

- **Redis Pub/Sub**: Real-time event broadcasting
- **Session Management**: Distributed session handling
- **Conflict Resolution**: Automatic conflict resolution
- **Health Monitoring**: Node health and failover

## 📊 Monitoring & Observability

### Health Checks

- Redis connectivity and latency
- AI service availability
- Memory usage and performance metrics
- Node-specific health status

### Logging

- Structured logging with configurable levels
- Request/response tracing
- Error tracking and debugging
- Performance metrics

## 🔌 MCP Client Integration

### VS Code Integration

1. Install MCP extension
2. Configure server endpoint: `http://localhost:3300/mcp`
3. Use MCP tools in your editor

### Cursor Integration

1. Enable MCP in Cursor settings
2. Add server configuration
3. Access todo tools through AI chat

### Custom Integration

The server implements the full MCP protocol and can be integrated with any MCP-compatible client.

## 🚀 Performance

### Optimizations

- **In-memory caching** for frequently accessed data
- **Connection pooling** for Redis operations
- **Batch processing** for AI analysis
- **Lazy loading** and efficient data structures

### Scalability

- **Horizontal scaling** with multiple nodes
- **Load balancing** with Caddy
- **Redis clustering** support
- **Stateless design** for easy scaling

## 🛡️ Security

- **Input validation** for all MCP tools
- **Error handling** with graceful degradation
- **Rate limiting** for API protection
- **Environment-based configuration**

## 📝 API Examples

### Adding a Todo

```bash
curl -X POST http://localhost:3300/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "todo_add", "arguments": {"name": "Complete project documentation"}}}'
```

### Listing Todos

```bash
curl -X POST http://localhost:3300/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "todo_list", "arguments": {}}}'
```

### AI Analysis

```bash
curl -X POST http://localhost:3300/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "todo_analyze", "arguments": {}}}'
```

## 🐛 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis is running and accessible
   - Check REDIS_URL configuration

2. **AI Analysis Not Working**
   - Verify OPENAI_API_KEY is set
   - Check AI_ANALYSIS_ENABLED setting

3. **Port Already in Use**
   - Change SERVER_PORT in environment
   - Check for conflicting processes

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=DEBUG npm run dev
```

## 📈 Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Advanced AI models and analysis
- [ ] User authentication and authorization
- [ ] Advanced caching strategies
- [ ] Metrics and analytics dashboard
- [ ] Kubernetes deployment manifests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## ⏱️ Development Time

**Total Time Spent**: ~6 hours

- Project setup and dependencies: 30 minutes
- Core MCP server implementation: 2 hours
- Redis integration and state management: 1 hour
- AI analysis integration: 1 hour
- Performance optimization and caching: 30 minutes
- Testing suite: 30 minutes
- Documentation and deployment: 1 hour

## 🎯 Key Achievements

✅ **Complete MCP Implementation**: Full Model Context Protocol support
✅ **Multi-node Architecture**: Distributed system with Redis synchronization
✅ **AI Integration**: OpenAI-powered task analysis with fallback
✅ **High Performance**: Caching and optimization strategies
✅ **Production Ready**: Docker containerization and health monitoring
✅ **Comprehensive Testing**: Unit, integration, and E2E tests
✅ **Documentation**: Complete setup and usage documentation

This implementation demonstrates a production-ready MCP server with advanced features including distributed architecture, AI integration, and comprehensive monitoring capabilities.
