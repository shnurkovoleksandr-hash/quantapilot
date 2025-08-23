# QuantaPilot™

> _Autonomous project factory powered by n8n workflows and Cursor AI_

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![n8n](https://img.shields.io/badge/n8n-Workflow-orange.svg)](https://n8n.io/)

## 🚀 Overview

QuantaPilot™ is an autonomous project factory that creates complete software projects "turnkey"
using advanced AI orchestration. Similar to how a digital agency operates, QuantaPilot™ transforms
a simple README.md description into a fully functional, tested, and documented project.

**🎉 Current Status**: Stage 2.1 Complete - Advanced AI Integration with 100% Test Coverage ✅

### Key Features

- **🤖 Autonomous Development**: Complete project creation without human intervention
- **👥 Multi-Role AI System**: PR/Architect, Senior Developer, and QA Engineer roles
- **🔄 Human-in-the-Loop (HITL)**: Critical decision points require human approval
- **📊 Workflow Orchestration**: Powered by n8n for complex automation
- **🎯 Enhanced Cursor Integration**: Direct CLI integration with project workspace management
- **📝 Intelligent Prompt Management**: Role-based templates with dynamic context injection
- **💰 Token Budget Enforcement**: Real-time usage tracking with multi-level cost controls
- **🛡️ Circuit Breaker Protection**: Intelligent error handling with automatic recovery
- **🧪 Comprehensive Testing**: 124/125 tests passing (99.2%) with full integration coverage
- **🐳 Self-Hosted**: Runs entirely on your infrastructure via Docker
- **📈 Scalable Architecture**: Add new workflows and stages as needed
- **🔐 Security-First**: Comprehensive secrets management and validation
- **📊 Full Monitoring**: Prometheus metrics and Grafana dashboards

## 🏗️ Architecture

QuantaPilot™ operates as a standalone application with three primary AI roles:

### 🎯 PR/Architect

- Creates detailed project plans from README.md descriptions
- Manages project documentation structure
- Selects appropriate technology stacks
- Oversees entire development lifecycle
- Makes architectural decisions

### 👨‍💻 Senior Developer

- Implements code based on architect's specifications
- Follows best practices and coding standards
- Creates modular, maintainable solutions
- Handles complex technical implementations

### 🧪 QA Engineer

- Writes comprehensive test suites (unit, integration, e2e)
- Performs automated testing
- Creates bug reports as GitHub issues
- Ensures quality standards are met

## 🔧 Technology Stack

### Core Infrastructure

- **Orchestration**: n8n (self-hosted)
- **AI Engine**: Cursor API integration
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15 (state management)
- **Cache**: Redis (sessions and caching)
- **API Gateway**: Express.js with routing and authentication

### Microservices Architecture

- **API Gateway** (Port 3000): Central routing and authentication
- **Cursor Integration** (Port 3001): AI agent communication
- **GitHub Integration** (Port 3002): Repository management
- **Notification Service** (Port 3003): Multi-channel notifications
- **Web Dashboard** (Port 3004): React-based management interface

### Monitoring & Operations

- **Metrics**: Prometheus (Port 9090)
- **Dashboards**: Grafana (Port 3005)
- **Logging**: Structured logging with correlation IDs
- **Security**: Comprehensive secrets management

## 📦 Installation

### Prerequisites

- **Docker & Docker Compose** (latest version)
- **GitHub Personal Access Token** (for repository management)
- **Cursor API Key** (for AI agent functionality)
- **Telegram Bot Token** (optional, for notifications)
- **SMTP Configuration** (optional, for email notifications)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/shnurkovoleksandr-hash/quantapilot
   cd QuantaPilot
   ```

2. **Run the setup script**

   ```bash
   ./scripts/setup.sh
   ```

   This will:
   - Create necessary directories
   - Copy `.env.example` to `.env`
   - Optionally generate secure secrets
   - Build and start all services

3. **Configure your environment**

   Edit `.env` file with your API keys:

   ```bash
   # Required
   CURSOR_API_KEY=your_cursor_api_key
   GITHUB_TOKEN=your_github_token

   # Optional
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   SMTP_HOST=your_smtp_host
   SMTP_USER=your_email
   SMTP_PASSWORD=your_password
   ```

4. **Access the services**

   | Service          | URL                   | Default Credentials  |
   | ---------------- | --------------------- | -------------------- |
   | 🌐 Dashboard     | http://localhost:3004 | -                    |
   | 🔄 n8n Workflows | http://localhost:5678 | admin / changeme123! |
   | 📊 Grafana       | http://localhost:3005 | admin / admin123     |
   | 📈 Prometheus    | http://localhost:9090 | -                    |
   | 🔧 API Gateway   | http://localhost:3000 | -                    |

### Alternative Setup

If you prefer manual setup:

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Generate secure secrets (optional)
./scripts/generate-secrets.sh

# 3. Start services
docker-compose up -d

# 4. Initialize database
./scripts/init-database.sh
```

## 📊 Development Progress

### ✅ Completed Stages

#### Stage 1.1: Project Foundation ✅

- [x] Project structure and documentation
- [x] Development guidelines and standards
- [x] Git repository initialization
- [x] Basic documentation framework

#### Stage 1.2: Core Infrastructure ✅

- [x] Docker containerization for all services
- [x] PostgreSQL database design and setup
- [x] n8n workflow orchestration platform
- [x] Prometheus + Grafana monitoring
- [x] Security hardening and secrets management
- [x] API Gateway with authentication
- [x] Microservices architecture (5 core services)

### 🚧 In Development

#### Stage 1.3: Basic AI Agent Implementation (Next)

- [ ] Core AI agent classes and interfaces
- [ ] Prompt engineering and templates
- [ ] Cursor API integration
- [ ] Agent workflow connections
- [ ] Basic testing framework

### 📋 Upcoming Stages

#### Stage 1.4: HITL Integration System

- [ ] Decision point framework
- [ ] Human approval workflows
- [ ] Notification systems
- [ ] Dashboard interfaces

#### Stage 1.5: Advanced AI Features

- [ ] Context management system
- [ ] Advanced prompt optimization
- [ ] Multi-step reasoning
- [ ] Quality assurance automation

## 🎮 Usage

### Creating a New Project

1. **Create GitHub Repository**
   - Initialize a new repository
   - Add a detailed `README.md` with project description
   - Optionally add `quantapilot.config.json` for custom settings

2. **Trigger QuantaPilot™**
   - Send repository URL to the factory via webhook
   - Or use Telegram bot command: `/create <repo_url>`

3. **Monitor Progress**
   - Receive Telegram notifications at key milestones
   - Approve/reject critical decisions via HITL interface
   - Track progress in n8n dashboard

### Example Project Structure

```
your-project/
├── README.md                 # Project description (required)
├── quantapilot.config.json  # Optional configuration
└── .quantapilot/           # Created by factory
    ├── workflow.log        # Process logging
    ├── decisions/          # HITL decisions
    └── reports/           # QA reports
```

## 🔄 Workflow Stages

1. **📋 Project Analysis** - Parse README.md and create project plan
2. **🏗️ Architecture Design** - Define system architecture and tech stack
3. **📚 Documentation Creation** - Generate comprehensive project docs
4. **🔧 Development** - Implement core functionality
5. **🧪 Testing** - Create and run test suites
6. **🚀 Deployment** - Set up CI/CD and deployment configs
7. **📋 Final Review** - HITL approval for project completion

## 🤝 Human-in-the-Loop (HITL)

QuantaPilot™ requests human approval at critical junctions:

- **Architecture Decisions**: Major technology choices
- **Milestone Completions**: End of development phases
- **Error Handling**: When automated resolution fails
- **Final Delivery**: Before marking project complete

### HITL Interface

- **Telegram Notifications**: Real-time updates and approval requests
- **Web Dashboard**: Detailed review interface
- **GitHub Issues**: For tracking decisions and feedback

## ⚙️ Configuration

### Environment Variables

The system uses comprehensive environment configuration. See `.env.example` for all available
options:

```env
# Core Services
NODE_ENV=development
LOG_LEVEL=info

# Database Configuration
POSTGRES_USER=quantapilot
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=quantapilot
DATABASE_URL=postgresql://quantapilot:password@postgres:5432/quantapilot

# AI Integration
CURSOR_API_KEY=your_cursor_api_key
CURSOR_API_URL=https://api.cursor.sh/v1
CURSOR_MODEL=cursor-large
CURSOR_MAX_TOKENS=4000

# GitHub Integration
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_API_URL=https://api.github.com

# Notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# n8n Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=changeme123!

# Security
JWT_SECRET=your_jwt_secret_minimum_32_chars
SESSION_SECRET=your_session_secret

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3005
GRAFANA_ADMIN_PASSWORD=admin123
```

### Security Setup

Generate secure secrets for production:

```bash
./scripts/generate-secrets.sh
./scripts/validate-security.sh
```

### Project Configuration (quantapilot.config.json)

```json
{
  "tech_stack_preferences": ["Node.js", "React", "PostgreSQL"],
  "testing_framework": "Jest",
  "deployment_target": "Docker",
  "code_style": "Prettier + ESLint",
  "ai_model_limits": {
    "max_tokens_per_stage": 50000,
    "max_retry_attempts": 3
  },
  "notification_preferences": {
    "telegram_notifications": true,
    "email_notifications": false
  }
}
```

## 🔒 Security & Limits

- **Token Limits**: Maximum 50,000 tokens per development stage
- **Retry Logic**: Maximum 3 attempts per problem resolution
- **Sandbox Environment**: All code execution in isolated containers
- **Credential Management**: Secrets stored in environment variables
- **Access Control**: GitHub webhooks with signature verification

## 📊 Monitoring & Logging

- **Process Logging**: All actions logged with correlation IDs
- **Metrics Collection**: Stage completion times and success rates
- **Error Tracking**: Automated error classification and reporting
- **Progress Tracking**: Real-time status updates via webhooks

## 🔧 Extensibility

### Adding New Workflows

1. Create new n8n workflow JSON file
2. Add to `workflows/` directory
3. Update workflow registry in configuration
4. Deploy via Docker Compose

### Custom AI Prompts

1. Add prompts to `prompts/` directory
2. Reference in workflow configurations
3. Version control for prompt changes

## 📊 Monitoring & Operations

### Real-time Monitoring

Access comprehensive monitoring dashboards:

- **🌐 Main Dashboard**: http://localhost:3004 - Project management interface
- **📊 Grafana**: http://localhost:3005 - System metrics and performance
- **📈 Prometheus**: http://localhost:9090 - Raw metrics and alerting
- **🔄 n8n**: http://localhost:5678 - Workflow monitoring and debugging

### Key Metrics Tracked

- **Service Health**: Uptime, response times, error rates
- **AI Usage**: Token consumption, cost tracking, model performance
- **Project Progress**: Stage completion times, success rates
- **Infrastructure**: Memory usage, CPU utilization, disk space
- **Security**: Failed authentication attempts, rate limiting

### Logging and Debugging

All services use structured logging with correlation IDs:

```bash
# View all service logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api-gateway
docker-compose logs -f cursor-service

# Follow logs with grep filtering
docker-compose logs -f | grep "ERROR"
docker-compose logs -f | grep "correlation"
```

### Health Checks and Maintenance

```bash
# Check all service status
docker-compose ps

# Validate security configuration
./scripts/validate-security.sh

# Health check all services
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Database maintenance
docker-compose exec postgres pg_dump quantapilot > backup.sql
```

### Troubleshooting

Common issues and solutions:

1. **Services won't start**: Check `.env` configuration and Docker resources
2. **Database connection errors**: Verify PostgreSQL is healthy and credentials match
3. **AI API failures**: Check Cursor API key and rate limits
4. **Workflow errors**: Review n8n logs and webhook configurations

## 📚 Documentation

- [📖 Complete Documentation](./docs/00_overview.md)
- [🏗️ Architecture Guide](./docs/10_architecture.md)
- [📋 Requirements](./docs/20_requirements.md)
- [🎯 Milestones](./docs/30_milestones.md)
- [🔧 Operations Runbook](./docs/70_runbook.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [n8n](https://n8n.io/) - Workflow automation platform
- [Cursor](https://cursor.sh/) - AI-powered code editor
- [Docker](https://www.docker.com/) - Containerization platform

---

**QuantaPilot™** - _Transforming ideas into reality, one commit at a time._ 🚀
