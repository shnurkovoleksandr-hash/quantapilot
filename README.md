# QuantaPilot™

> _Autonomous project factory powered by n8n workflows and Cursor AI_

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![n8n](https://img.shields.io/badge/n8n-Workflow-orange.svg)](https://n8n.io/)

## 🚀 Overview

QuantaPilot™ is an autonomous project factory that creates complete software projects "turnkey" using advanced AI orchestration. Similar to how a digital agency operates, QuantaPilot™ transforms a simple README.md description into a fully functional, tested, and documented project.

### Key Features

- **🤖 Autonomous Development**: Complete project creation without human intervention
- **👥 Multi-Role AI System**: PR/Architect, Senior Developer, and QA Engineer roles
- **🔄 Human-in-the-Loop (HITL)**: Critical decision points require human approval
- **📊 Workflow Orchestration**: Powered by n8n for complex automation
- **🎯 Cursor Integration**: Leverages Cursor CLI for actual code generation
- **🐳 Self-Hosted**: Runs entirely on your infrastructure via Docker
- **📈 Scalable Architecture**: Add new workflows and stages as needed

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

- **Orchestration**: n8n (self-hosted)
- **AI Engine**: Cursor CLI + Background API
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL (state management)
- **Version Control**: GitHub API
- **Notifications**: Telegram Bot API
- **Process Management**: Node.js runtime

## 📦 Installation

### Prerequisites

- Docker & Docker Compose
- GitHub Personal Access Token
- Telegram Bot Token
- Cursor Pro subscription

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/shnurkovoleksandr-hash/quantapilot
   cd QuantaPilot
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start the factory**

   ```bash
   docker-compose up -d
   ```

4. **Access n8n dashboard**
   ```
   http://localhost:5678
   ```

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

```env
# n8n Configuration
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_password

# Database
POSTGRES_USER=quantapilot
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=quantapilot

# GitHub Integration
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Cursor
CURSOR_API_KEY=your_cursor_api_key
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
