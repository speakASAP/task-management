# MCP Server Todo Application

A multi-node distributed todo application built with the Model Context Protocol (MCP) that provides intelligent task management and prioritization using AI analysis.

## 🚀 Features

- **Multi-node Architecture**: Distributed system with Redis-based state synchronization
- **MCP Protocol Support**: Full Model Context Protocol implementation for AI agent integration
- **AI-Powered Analysis**: OpenAI integration for intelligent task prioritization
- **Real-time Synchronization**: Redis pub/sub for distributed state management
- **High Performance**: In-memory caching with Redis persistence
- **Docker Ready**: Complete containerization with multi-node setup
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

- **MCP Server**: Main server implementing the Model Context Protocol
- **Todo Storage**: Redis-based storage with in-memory caching
- **AI Analysis Engine**: OpenAI integration with circuit breaker pattern
- **State Synchronization**: Redis pub/sub for multi-node coordination
- **Load Balancer**: Caddy for round-robin distribution

### Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **MCP SDK**: @modelcontextprotocol/sdk
- **Storage**: Redis 7
- **AI Provider**: OpenAI API
- **Load Balancer**: Caddy
- **Containerization**: Docker + Docker Compose

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
SERVER_PORT=3000
NODE_ID=node-1

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
docker run -p 3000:3000 -e REDIS_URL=redis://host.docker.internal:6379 mcp-todo-server
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

- 2 MCP server instances (ports 3001, 3002)
- Redis instance (port 6379)
- Caddy load balancer (port 3000)

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

- **Priority Scoring**: AI-generated priority scores (1-10)
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
2. Configure server endpoint: `http://localhost:3000/mcp`
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
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "todo_add", "arguments": {"name": "Complete project documentation"}}}'
```

### Listing Todos

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "todo_list", "arguments": {}}}'
```

### AI Analysis

```bash
curl -X POST http://localhost:3000/mcp \
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
