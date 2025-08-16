# QuantaPilot Backend

This is the backend API for QuantaPilot, a multi-agent development platform.

## Features

- Express.js REST API with TypeScript
- PostgreSQL database with comprehensive schema
- Redis for caching and session management
- Health check endpoints for monitoring
- Comprehensive logging with Winston
- Docker containerization
- Automated testing with Jest
- Code quality tools (ESLint, Prettier)

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

## Quick Start

1. **Clone the repository and navigate to the backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   ```bash
   cp ../.env.example ../.env
   # Edit ../.env with your actual values
   ```

4. **Build the project:**

   ```bash
   npm run build
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Docker Setup

The backend is designed to run with Docker Compose. From the project root:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop all services
docker-compose down
```

## API Endpoints

### Health Checks

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health information
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Root

- `GET /` - API information

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
src/
├── api/           # API routes and controllers
├── config/        # Configuration files
├── database/      # Database models and migrations
├── services/      # Business logic services
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── index.ts       # Application entry point
```

### Code Quality

The project uses:

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type safety
- **Jest** for testing

Pre-commit hooks are configured to run linting and type checking automatically.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `OPENAI_API_KEY` - OpenAI API key
- `GITHUB_TOKEN` - GitHub personal access token
- `TELEGRAM_BOT_TOKEN` - Telegram bot token
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level (default: info)

## Database Schema

The database includes the following tables:

- `projects` - Project information
- `agents` - AI agent configurations
- `tasks` - Task definitions and results
- `executions` - Task execution history
- `logs` - Application logs
- `notifications` - Notification queue

## Monitoring

The application includes:

- Health check endpoints for Kubernetes readiness/liveness probes
- Structured logging with correlation IDs
- Memory usage monitoring
- Service status tracking

## Deployment

The application is containerized with a multi-stage Docker build:

```bash
# Build the image
docker build -t quantapilot-backend .

# Run the container
docker run -p 3000:3000 quantapilot-backend
```

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before committing
