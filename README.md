# QuantaPilot Development Plan

## Anchor Document

**Дата создания:** 16 августа 2025  
**Версия:** 1.0  
**Статус:** Active Development Plan

### Технический стек
- **Оркестратор:** n8n (self-hosted)
- **Backend:** Node.js + TypeScript + Express
- **Database:** PostgreSQL + Redis (кэш/очереди)
- **APIs:** OpenAI, Cursor, GitHub, Telegram
- **Мониторинг:** Prometheus + Grafana
- **Контейнеризация:** Docker + Docker Compose

### Архитектурные принципы
- Clean Architecture
- CQRS pattern
- Event Sourcing для критических операций
- Микросервисная архитектура
- TDD подход
- Строгое соблюдение границ модулей

---

## Структура проекта

```
quantapilot/
├── docker-compose.yml
├── .env.example
├── README.md
├── n8n/
│   ├── workflows/
│   │   ├── main-project-development.json     # 🎯 ГЛАВНЫЙ workflow - точка входа
│   │   └── sub-workflows/                    # 📁 Модульные sub-workflows  
│   │       ├── document-generation.json
│   │       ├── document-validation.json
│   │       ├── development-cycle.json
│   │       └── testing-cycle.json
│   ├── custom-nodes/
│   │   └── QuantaPilot/
│   │       ├── agents/
│   │       │   ├── PRArchitectureAgent.node.ts
│   │       │   ├── DevelopmentAgent.node.ts
│   │       │   └── QAAgent.node.ts
│   │       └── services/
│   └── credentials/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── base/
│   │   │   │   ├── IAgent.ts
│   │   │   │   └── BaseAgent.ts
│   │   │   ├── PRArchitectureAgent.ts
│   │   │   ├── DevelopmentAgent.ts
│   │   │   └── QAAgent.ts
│   │   ├── services/
│   │   │   ├── AgentService.ts
│   │   │   ├── TaskService.ts
│   │   │   ├── ProjectService.ts
│   │   │   ├── GitHubService.ts
│   │   │   ├── TelegramService.ts
│   │   │   ├── DocumentService.ts
│   │   │   ├── TokenUsageService.ts
│   │   │   └── NotificationService.ts
│   │   ├── database/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   └── migrations/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   └── validators/
│   │   ├── config/
│   │   ├── utils/
│   │   └── types/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── package.json
│   ├── tsconfig.json
│   ├── jest.config.js
│   └── Dockerfile
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_agents_table.sql
│   │   ├── 003_projects_table.sql
│   │   ├── 004_tasks_table.sql
│   │   ├── 005_executions_table.sql
│   │   ├── 006_logs_table.sql
│   │   └── 007_notifications_table.sql
│   ├── schemas/
│   │   ├── projects.schema.json
│   │   ├── tasks.schema.json
│   │   └── agents.schema.json
│   └── seeds/
├── monitoring/
│   ├── prometheus/
│   │   └── prometheus.yml
│   ├── grafana/
│   │   ├── dashboards/
│   │   └── provisioning/
│   └── docker-compose.monitoring.yml
├── docs/
│   ├── architecture.md
│   ├── api-spec.yml
│   ├── deployment.md
│   ├── troubleshooting.md
│   └── examples/
│       ├── simple-react-component/
│       └── nodejs-api/
└── scripts/
    ├── setup.sh
    ├── deploy.sh
    └── backup.sh
```

---

## План реализации (7 этапов)

### Этап 1: Проектирование архитектуры и настройка инфраструктуры
**Время:** 3-5 дней  
**Приоритет:** Критический

#### Задачи:
1. **Создание основной структуры проекта**
   - Инициализация Git репозитория
   - Создание папочной структуры
   - Настройка package.json и tsconfig.json
   - Конфигурация ESLint и Prettier

2. **Проектирование схемы БД**
```sql
-- projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    repository_url VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'initialized',
    documentation_sha VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'pr_architecture', 'development', 'qa'
    status VARCHAR(50) NOT NULL DEFAULT 'idle',
    current_project_id UUID REFERENCES projects(id),
    config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    agent_id UUID REFERENCES agents(id),
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    prompt TEXT,
    result TEXT,
    tokens_used INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata JSONB
);

-- executions table
CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    status VARCHAR(50) NOT NULL,
    input_data JSONB,
    output_data JSONB,
    tokens_consumed INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- logs table
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    agent_id UUID REFERENCES agents(id),
    level VARCHAR(20) NOT NULL, -- 'info', 'warn', 'error', 'debug'
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    type VARCHAR(50) NOT NULL, -- 'status_update', 'error', 'completion'
    channel VARCHAR(50) NOT NULL, -- 'telegram', 'email'
    recipient VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

3. **Настройка Docker окружения**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: quantapilot
      POSTGRES_USER: quantapilot
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_PORT: 5432
      DB_POSTGRESDB_DATABASE: n8n
      DB_POSTGRESDB_USER: n8n
      DB_POSTGRESDB_PASSWORD: ${N8N_DB_PASSWORD}
      N8N_ENCRYPTION_KEY: ${N8N_ENCRYPTION_KEY}
      WEBHOOK_URL: http://localhost:5678
    volumes:
      - ./n8n:/home/node/.n8n
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://quantapilot:${DB_PASSWORD}@postgres:5432/quantapilot
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN}
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

#### DoD Этапа 1:
- ✅ Развернутая локальная инфраструктура (все контейнеры запускаются)
- ✅ Рабочая БД со схемой (миграции выполнены)
- ✅ n8n доступен по http://localhost:5678
- ✅ Backend API отвечает 200 на health check endpoint
- ✅ Все переменные окружения настроены
- ✅ Git hooks настроены для pre-commit проверок

---

### Этап 2: Базовый backend и модель агентов
**Время:** 4-6 дней  
**Приоритет:** Критический

#### Задачи:
1. **Создание базовых интерфейсов и типов**
```typescript
// src/types/index.ts
export interface Task {
  id: string;
  projectId: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: number;
  prompt: string;
  result?: string;
  tokensUsed?: number;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  success: boolean;
  result?: string;
  tokensUsed: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  repositoryUrl: string;
  status: 'initialized' | 'documenting' | 'developing' | 'testing' | 'completed' | 'paused' | 'failed';
  documentationSha?: string;
  metadata?: Record<string, any>;
}

// src/agents/base/IAgent.ts
export interface IAgent {
  id: string;
  type: 'pr_architecture' | 'development' | 'qa';
  status: 'idle' | 'busy' | 'error';
  executeTask(task: Task): Promise<TaskResult>;
  validateTask(task: Task): boolean;
  getCapabilities(): string[];
}
```

2. **Реализация базового агента**
```typescript
// src/agents/base/BaseAgent.ts
export abstract class BaseAgent implements IAgent {
  public readonly id: string;
  public readonly type: AgentType;
  public status: AgentStatus = 'idle';
  
  constructor(type: AgentType) {
    this.id = uuidv4();
    this.type = type;
  }

  abstract executeTask(task: Task): Promise<TaskResult>;
  abstract validateTask(task: Task): boolean;
  abstract getCapabilities(): string[];

  protected async logExecution(taskId: string, status: string, details?: any): Promise<void> {
    // Логирование в БД
  }

  protected async trackTokenUsage(tokens: number): Promise<void> {
    // Трекинг использования токенов
  }
}
```

3. **Реализация PR/Architecture Agent**
```typescript
// src/agents/PRArchitectureAgent.ts
export class PRArchitectureAgent extends BaseAgent {
  private openaiClient: OpenAI;

  constructor(apiKey: string) {
    super('pr_architecture');
    this.openaiClient = new OpenAI({ apiKey });
  }

  async executeTask(task: Task): Promise<TaskResult> {
    this.status = 'busy';
    
    try {
      switch (task.type) {
        case 'analyze_requirements':
          return await this.analyzeRequirements(task);
        case 'generate_documentation':
          return await this.generateDocumentation(task);
        case 'create_architecture':
          return await this.createArchitecture(task);
        case 'decompose_tasks':
          return await this.decomposeTasks(task);
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
    } catch (error) {
      this.status = 'error';
      return {
        success: false,
        tokensUsed: 0,
        error: error.message
      };
    } finally {
      this.status = 'idle';
    }
  }

  private async analyzeRequirements(task: Task): Promise<TaskResult> {
    const prompt = `
      Analyze the following README.md content and extract:
      1. Project overview and goals
      2. Functional requirements
      3. Technical requirements
      4. Constraints and limitations
      5. Success criteria
      
      README content:
      ${task.prompt}
      
      Respond in JSON format with the structure:
      {
        "overview": "...",
        "functional_requirements": ["..."],
        "technical_requirements": ["..."],
        "constraints": ["..."],
        "success_criteria": ["..."]
      }
    `;

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    const tokensUsed = response.usage?.total_tokens || 0;
    await this.trackTokenUsage(tokensUsed);

    return {
      success: true,
      result: response.choices[0].message.content,
      tokensUsed
    };
  }

  // Остальные методы...
}
```

4. **Сервисы**
```typescript
// src/services/AgentService.ts
export class AgentService {
  private agents: Map<string, IAgent> = new Map();
  private taskQueue: Queue<Task>;

  constructor() {
    this.taskQueue = new Queue('agent-tasks');
    this.initializeAgents();
  }

  private initializeAgents(): void {
    // Инициализация агентов
    const prAgent = new PRArchitectureAgent(process.env.OPENAI_API_KEY!);
    const devAgent = new DevelopmentAgent(process.env.CURSOR_API_KEY!);
    const qaAgent = new QAAgent(process.env.CURSOR_API_KEY!);

    this.agents.set(prAgent.id, prAgent);
    this.agents.set(devAgent.id, devAgent);
    this.agents.set(qaAgent.id, qaAgent);
  }

  async assignTask(task: Task, agentType: AgentType): Promise<string> {
    const agent = this.findAvailableAgent(agentType);
    if (!agent) {
      throw new Error(`No available agent of type ${agentType}`);
    }

    await this.taskQueue.add('execute-task', {
      taskId: task.id,
      agentId: agent.id
    });

    return agent.id;
  }

  private findAvailableAgent(type: AgentType): IAgent | undefined {
    return Array.from(this.agents.values())
      .find(agent => agent.type === type && agent.status === 'idle');
  }
}
```

5. **API Routes**
```typescript
// src/api/routes/projects.ts
export const projectRoutes = Router();

projectRoutes.post('/', async (req, res) => {
  try {
    const { repositoryUrl, name } = req.body;
    const project = await ProjectService.createProject(name, repositoryUrl);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

projectRoutes.get('/:id/status', async (req, res) => {
  try {
    const project = await ProjectService.getProject(req.params.id);
    res.json({
      id: project.id,
      status: project.status,
      progress: await ProjectService.getProgress(project.id)
    });
  } catch (error) {
    res.status(404).json({ error: 'Project not found' });
  }
});

projectRoutes.post('/:id/continue', async (req, res) => {
  try {
    await ProjectService.continueProject(req.params.id);
    res.json({ message: 'Project resumed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

#### DoD Этапа 2:
- ✅ Все агенты отвечают на тестовые задачи
- ✅ Сохранение задач и результатов в БД работает
- ✅ Unit тесты для агентов проходят (>80% coverage)
- ✅ API endpoints возвращают корректные ответы
- ✅ Интеграция с OpenAI API работает
- ✅ Error handling обрабатывает все исключения
- ✅ Логирование работает корректно

---

### Этап 3: GitHub интеграция и документооборот
**Время:** 3-4 дня  
**Приоритет:** Высокий

#### Задачи:
1. **GitHub Service**
```typescript
// src/services/GitHubService.ts
export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async cloneRepository(url: string): Promise<string> {
    // Клонирование репозитория в временную папку
    const tempDir = path.join(os.tmpdir(), 'quantapilot', uuidv4());
    await fs.ensureDir(tempDir);
    
    await git.clone({
      fs,
      http,
      dir: tempDir,
      url,
      singleBranch: true,
      depth: 1
    });

    return tempDir;
  }

  async readFile(repoPath: string, filePath: string): Promise<string> {
    const fullPath = path.join(repoPath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  async createFile(repoPath: string, filePath: string, content: string): Promise<void> {
    const fullPath = path.join(repoPath, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async createIssue(owner: string, repo: string, title: string, body: string): Promise<number> {
    const response = await this.octokit.rest.issues.create({
      owner,
      repo,
      title,
      body
    });
    return response.data.number;
  }

  async createCommit(repoPath: string, message: string, files: FileChange[]): Promise<string> {
    // Добавление файлов в git
    for (const file of files) {
      await git.add({
        fs,
        dir: repoPath,
        filepath: file.path
      });
    }

    // Создание коммита
    const sha = await git.commit({
      fs,
      dir: repoPath,
      message,
      author: {
        name: 'QuantaPilot',
        email: 'quantapilot@example.com'
      }
    });

    return sha;
  }

  async pushChanges(repoPath: string): Promise<void> {
    await git.push({
      fs,
      http,
      dir: repoPath,
      remote: 'origin',
      ref: 'main'
    });
  }
}
```

2. **Document Generator Service**
```typescript
// src/services/DocumentService.ts
export class DocumentService {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.loadTemplates();
  }

  private loadTemplates(): void {
    this.templates.set('00_overview', `
# Project Overview

## Project Name
{{project_name}}

## Description
{{description}}

## Goals
{{goals}}

## Stakeholders
{{stakeholders}}

## Success Metrics
{{success_metrics}}
    `);

    this.templates.set('10_architecture', `
# System Architecture

## High-Level Architecture
{{architecture_overview}}

## Components
{{components}}

## Data Flow
{{data_flow}}

## Technology Stack
{{tech_stack}}

## Deployment Architecture
{{deployment}}
    `);

    // Остальные шаблоны...
  }

  async generateDocuments(projectAnalysis: any): Promise<DocumentSet> {
    const documents: DocumentSet = {};

    for (const [templateName, template] of this.templates) {
      const content = this.renderTemplate(template, projectAnalysis);
      documents[templateName] = {
        filename: `${templateName}.md`,
        content,
        sha: this.calculateSHA(content)
      };
    }

    return documents;
  }

  private renderTemplate(template: string, data: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || `[${key.toUpperCase()}_NOT_PROVIDED]`;
    });
  }

  private calculateSHA(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async validateDocuments(documents: DocumentSet): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const [name, doc] of Object.entries(documents)) {
      // Проверка на незаполненные поля
      const missingFields = doc.content.match(/\[[\w_]+_NOT_PROVIDED\]/g);
      if (result.status === 'fulfilled') {
        healthData.checks[checkName] = result.value;
      } else {
        healthData.checks[checkName] = {
          status: 'unhealthy',
          error: result.reason.message,
          responseTime: 0
        };
        healthData.status = 'unhealthy';
      }
    });

    return healthData;
  }

  private static async checkDatabase(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      await db.query('SELECT 1');
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start
      };
    }
  }

  private static async checkRedis(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      await redisClient.ping();
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start
      };
    }
  }

  private static async checkOpenAI(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      // Проверка доступности API через минимальный запрос
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      await openai.models.list();
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start
      };
    }
  }

  private static async checkGitHub(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      await octokit.rest.users.getAuthenticated();
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start
      };
    }
  }

  private static async checkTelegram(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start
      };
    }
  }

  private static async checkN8n(): Promise<ServiceHealthStatus> {
    const start = Date.now();
    try {
      const response = await fetch('http://n8n:5678/healthz');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return {
        status: 'healthy',
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - start
      };
    }
  }
}
```

4. **Grafana Dashboard Configuration**
```yaml
# monitoring/grafana/dashboards/quantapilot-main.json
{
  "dashboard": {
    "title": "QuantaPilot Main Dashboard",
    "panels": [
      {
        "title": "Active Projects",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(quantapilot_active_projects)",
            "legendFormat": "Total Active"
          }
        ]
      },
      {
        "title": "Token Usage (Last 24h)",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(quantapilot_tokens_used_total[1h])",
            "legendFormat": "{{agent_type}}"
          }
        ]
      },
      {
        "title": "Task Execution Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(quantapilot_task_execution_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile - {{agent_type}}"
          }
        ]
      },
      {
        "title": "API Response Times",
        "type": "graph", 
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(quantapilot_api_response_duration_seconds_bucket[5m]))",
            "legendFormat": "50th percentile - {{service}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(quantapilot_tasks_executed_total{status=\"failed\"}[5m])",
            "legendFormat": "Failed tasks - {{agent_type}}"
          }
        ]
      },
      {
        "title": "Health Status",
        "type": "table",
        "targets": [
          {
            "expr": "up{job=\"quantapilot\"}",
            "legendFormat": "Service Status"
          }
        ]
      }
    ]
  }
}
```

#### DoD Этапа 6:
- ✅ Лимиты токенов проверяются перед каждым API вызовом
- ✅ Проекты автоматически паузятся при превышении лимитов
- ✅ Prometheus метрики собираются корректно
- ✅ Grafana дашборд показывает реальные данные
- ✅ Health check endpoints отвечают корректно
- ✅ Алерты настроены и срабатывают
- ✅ Логирование превышений лимитов работает

---

### Этап 7: Тестирование и документация
**Время:** 3-4 дня  
**Приоритет:** Критический

#### Задачи:
1. **Comprehensive Testing Strategy**
```typescript
// tests/e2e/project-lifecycle.test.ts
describe('Project Lifecycle E2E', () => {
  let testProjectId: string;
  let testRepoUrl: string;

  beforeAll(async () => {
    // Подготовка тестового репозитория
    testRepoUrl = await createTestRepository();
  });

  afterAll(async () => {
    // Очистка тестовых данных
    await cleanupTestData(testProjectId);
  });

  test('Full project lifecycle from README to completion', async () => {
    // 1. Создание проекта
    const createResponse = await request(app)
      .post('/api/projects')
      .send({
        name: 'Test React Component',
        repositoryUrl: testRepoUrl
      })
      .expect(201);

    testProjectId = createResponse.body.id;

    // 2. Запуск workflow через n8n webhook
    const workflowResponse = await request('http://localhost:5678')
      .post('/webhook/start-project')
      .send({
        project_id: testProjectId,
        repository_url: testRepoUrl
      })
      .expect(200);

    // 3. Ожидание завершения документирования
    await waitForStatus(testProjectId, 'developing', 60000);

    // 4. Проверка созданной документации
    const project = await ProjectService.getProject(testProjectId);
    expect(project.documentationSha).toBeDefined();

    const docs = await GitHubService.listFiles(testRepoUrl, 'docs/');
    expect(docs).toContain('00_overview.md');
    expect(docs).toContain('10_architecture.md');

    // 5. Ожидание завершения разработки
    await waitForStatus(testProjectId, 'testing', 120000);

    // 6. Проверка созданного кода
    const codeFiles = await GitHubService.listFiles(testRepoUrl, 'src/');
    expect(codeFiles.length).toBeGreaterThan(0);

    // 7. Ожидание завершения тестирования
    await waitForStatus(testProjectId, 'completed', 180000);

    // 8. Проверка финального состояния
    const finalProject = await ProjectService.getProject(testProjectId);
    expect(finalProject.status).toBe('completed');

    // 9. Проверка метрик
    const metrics = await MetricsService.getProjectMetrics(testProjectId);
    expect(metrics.tasksCompleted).toBeGreaterThan(0);
    expect(metrics.tokensUsed).toBeGreaterThan(0);

  }, 300000); // 5 минут timeout

  test('Error handling and recovery', async () => {
    // Тест обработки ошибок и восстановления
    const projectId = await createTestProject('Error Test Project');

    // Симуляция ошибки в OpenAI API
    mockOpenAIError();

    await triggerWorkflow(projectId);
    await waitForStatus(projectId, 'paused', 30000);

    // Восстановление и продолжение
    restoreOpenAIMock();
    await ProjectService.continueProject(projectId);
    await waitForStatus(projectId, 'developing', 60000);
  });

  test('Token limits enforcement', async () => {
    // Тест ограничений токенов
    const projectId = await createTestProject('Token Limit Test');

    // Установка низких лимитов для теста
    await TokenUsageService.setTestLimits({
      'pr_architecture': { hourly: 100 }
    });

    await triggerWorkflow(projectId);
    
    // Проект должен быть приостановлен из-за лимитов
    await waitForStatus(projectId, 'paused', 30000);

    const project = await ProjectService.getProject(projectId);
    expect(project.pauseReason).toContain('Token limit exceeded');
  });
});

// tests/integration/agents.test.ts
describe('Agents Integration', () => {
  test('PR Architecture Agent analysis', async () => {
    const agent = new PRArchitectureAgent(process.env.OPENAI_API_KEY!);
    
    const task: Task = {
      id: 'test-task',
      projectId: 'test-project',
      type: 'analyze_requirements',
      status: 'pending',
      priority: 1,
      prompt: readmeContent
    };

    const result = await agent.executeTask(task);
    
    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.tokensUsed).toBeGreaterThan(0);
    
    const analysis = JSON.parse(result.result!);
    expect(analysis.overview).toBeDefined();
    expect(analysis.functional_requirements).toBeInstanceOf(Array);
  });

  test('Development Agent code generation', async () => {
    const agent = new DevelopmentAgent(process.env.CURSOR_API_KEY!);
    
    const task: Task = {
      id: 'test-dev-task',
      projectId: 'test-project',
      type: 'create_component',
      status: 'pending',
      priority: 1,
      prompt: 'Create a React button component with TypeScript'
    };

    const result = await agent.executeTask(task);
    
    expect(result.success).toBe(true);
    expect(result.result).toContain('React');
    expect(result.result).toContain('TypeScript');
  });
});

// tests/unit/services.test.ts
describe('Services Unit Tests', () => {
  describe('ProjectService', () => {
    test('createProject creates valid project', async () => {
      const project = await ProjectService.createProject(
        'Test Project',
        'https://github.com/test/repo'
      );

      expect(project.id).toBeDefined();
      expect(project.status).toBe('initialized');
      expect(project.name).toBe('Test Project');
    });

    test('pauseProject sets correct status', async () => {
      const project = await createTestProject();
      await ProjectService.pauseProject(project.id, 'Test pause');

      const updatedProject = await ProjectService.getProject(project.id);
      expect(updatedProject.status).toBe('paused');
    });
  });

  describe('TokenUsageService', () => {
    test('trackUsage saves tokens correctly', async () => {
      await TokenUsageService.trackUsage('pr_architecture', 'test-project', 1000);

      const usage = await TokenUsageService.getUsageForProject('test-project');
      expect(usage.total).toBe(1000);
    });

    test('checkLimits returns false when exceeded', async () => {
      // Установка тестовых лимитов
      await setTestTokenLimits({ hourly: 100 });
      
      // Добавление использования сверх лимита
      await TokenUsageService.trackUsage('pr_architecture', 'test-project', 150);

      const result = await TokenUsageService.checkLimits('pr_architecture');
      expect(result).toBe(false);
    });
  });
});
```

2. **API Documentation (OpenAPI)**
```yaml
# docs/api-spec.yml
openapi: 3.0.3
info:
  title: QuantaPilot API
  description: Automated Application Development Environment API
  version: 1.0.0
  contact:
    name: QuantaPilot Team
    email: support@quantapilot.example.com

servers:
  - url: http://localhost:3000/api
    description: Local development server

paths:
  /projects:
    post:
      summary: Create new project
      tags: [Projects]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, repositoryUrl]
              properties:
                name:
                  type: string
                  description: Project name
                  example: "My React App"
                repositoryUrl:
                  type: string
                  format: uri
                  description: GitHub repository URL
                  example: "https://github.com/user/repo"
      responses:
        '201':
          description: Project created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Project'
        '400':
          description: Invalid request data
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /projects/{id}/status:
    get:
      summary: Get project status
      tags: [Projects]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Project status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectStatus'
        '404':
          description: Project not found

  /projects/{id}/continue:
    post:
      summary: Continue paused project
      tags: [Projects]
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Project resumed
        '400':
          description: Project cannot be resumed

  /health:
    get:
      summary: Health check
      tags: [System]
      responses:
        '200':
          description: System health status
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthStatus'

  /metrics:
    get:
      summary: Prometheus metrics
      tags: [System]
      responses:
        '200':
          description: Metrics in Prometheus format
          content:
            text/plain:
              schema:
                type: string

components:
  schemas:
    Project:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        repositoryUrl:
          type: string
          format: uri
        status:
          type: string
          enum: [initialized, documenting, developing, testing, completed, paused, failed]
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    ProjectStatus:
      type: object
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
        progress:
          type: number
          minimum: 0
          maximum: 100
        currentMilestone:
          type: string
        tasksCompleted:
          type: integer
        totalTasks:
          type: integer
        tokensUsed:
          type: integer

    HealthStatus:
      type: object
      properties:
        status:
          type: string
          enum: [healthy, unhealthy]
        timestamp:
          type: string
          format: date-time
        version:
          type: string
        uptime:
          type: number
        checks:
          type: object
          additionalProperties:
            type: object
            properties:
              status:
                type: string
                enum: [healthy, unhealthy]
              responseTime:
                type: number
              error:
                type: string

    Error:
      type: object
      properties:
        error:
          type: string
        code:
          type: string
        timestamp:
          type: string
          format: date-time
```

3. **Deployment Documentation**
```markdown
# docs/deployment.md

# QuantaPilot Deployment Guide

## Prerequisites

- Docker и Docker Compose 
- Git
- 8GB RAM minimum
- 50GB free disk space
- Node.js 18+ (для разработки)

## Environment Variables

Создайте файл `.env` на основе `.env.example`:

```bash
# Database
DB_PASSWORD=your_secure_password
N8N_DB_PASSWORD=your_n8n_password

# n8n
N8N_ENCRYPTION_KEY=your_32_character_encryption_key

# APIs
OPENAI_API_KEY=sk-your_openai_key
GITHUB_TOKEN=ghp_your_github_token
TELEGRAM_BOT_TOKEN=your_bot_token
CURSOR_API_KEY=your_cursor_key

# Application
APP_VERSION=1.0.0
NODE_ENV=production
LOG_LEVEL=info

# Monitoring
GRAFANA_ADMIN_PASSWORD=admin_password
```

## Quick Start

1. **Клонирование репозитория:**
```bash
git clone https://github.com/your-org/quantapilot.git
cd quantapilot
```

2. **Настройка окружения:**
```bash
cp .env.example .env
# Отредактируйте .env файл
```

3. **Запуск системы:**
```bash
docker-compose up -d
```

4. **Проверка статуса:**
```bash
# Проверка всех сервисов
docker-compose ps

# Health check
curl http://localhost:3000/api/health
```

5. **Доступ к интерфейсам:**
- n8n: http://localhost:5678
- API: http://localhost:3000
- Grafana: http://localhost:3001 (admin/admin_password)
- Prometheus: http://localhost:9090

## Configuration

### n8n Setup

1. Откройте http://localhost:5678
2. Создайте admin аккаунт
3. Импортируйте workflows из `n8n/workflows/`
4. Настройте credentials для всех сервисов

### Telegram Bot Setup

1. Создайте бота через @BotFather
2. Получите токен и добавьте в `.env`
3. Настройте webhook (опционально)

### GitHub Integration

1. Создайте Personal Access Token
2. Права: repo, issues, contents
3. Добавьте токен в `.env`

## Monitoring Setup

```bash
# Запуск мониторинга
docker-compose -f docker-compose.monitoring.yml up -d

# Импорт дашбордов Grafana
curl -X POST http://admin:admin_password@localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @monitoring/grafana/dashboards/quantapilot-main.json
```

## Backup and Recovery

### Database Backup
```bash
docker-compose exec postgres pg_dump -U quantapilot quantapilot > backup.sql
```

### Full System Backup
```bash
./scripts/backup.sh
```

### Recovery
```bash
./scripts/restore.sh backup-2025-08-16.tar.gz
```

## Security Considerations

1. **API Keys:** Храните в безопасном месте, ротируйте регулярно
2. **Database:** Используйте сильные пароли
3. **Network:** Настройте firewall для production
4. **Updates:** Регулярно обновляйте зависимости

## Troubleshooting

### Common Issues

**Проблема:** n8n не запускается
```bash
# Проверка логов
docker-compose logs n8n

# Возможное решение
docker-compose down
docker volume rm quantapilot_n8n_data
docker-compose up -d
```

**Проблема:** Превышение лимитов токенов
- Проверьте usage в Grafana
- Увеличьте лимиты в коде
- Оптимизируйте промпты

**Проблема:** GitHub API rate limit
- Проверьте токен и права
- Увеличьте паузы между запросами

## Performance Tuning

### Database
```sql
-- PostgreSQL optimization
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
```

### Redis
```bash
# redis.conf optimization
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### Application
- Увеличьте лимиты памяти для Node.js
- Настройте connection pooling
- Включите gzip compression
```

4. **Security Audit Checklist**
```markdown
# docs/security-checklist.md

# QuantaPilot Security Checklist

## API Security
- [ ] Все API endpoints требуют аутентификации
- [ ] Rate limiting настроен для всех endpoints
- [ ] Input validation реализована для всех параметров
- [ ] SQL injection protection активна
- [ ] XSS protection включена
- [ ] CORS настроен корректно

## Secrets Management
- [ ] API ключи не хардкодятся в коде
- [ ] Environment variables используются для всех секретов
- [ ] .env файлы в .gitignore
- [ ] Production секреты хранятся в vault/secrets manager
- [ ] Ротация ключей запланирована

## Database Security
- [ ] Сильные пароли для всех аккаунтов
- [ ] Минимальные привилегии для app пользователей
- [ ] Backup encryption включено
- [ ] Connection encryption (SSL/TLS)
- [ ] Аудит логи включены

## Container Security
- [ ] Non-root пользователи в контейнерах
- [ ] Minimal base images используются
- [ ] Vulnerability scanning настроен
- [ ] Secrets не в Docker images
- [ ] Security contexts настроены

## Network Security
- [ ] Firewall настроен
- [ ] Только необходимые порты открыты
- [ ] TLS для external communications
- [ ] Internal network isolation
- [ ] VPN для admin access

## Monitoring & Logging
- [ ] Security events логируются
- [ ] Централизованное логирование
- [ ] Алерты на suspicious activity
- [ ] Log retention политика
- [ ] SIEM интеграция (если требуется)

## Access Control
- [ ] Принцип минимальных привилегий
- [ ] Multi-factor authentication
- [ ] Regular access reviews
- [ ] Automated account provisioning/deprovisioning
- [ ] Strong password policies
```

#### DoD Этапа 7:
- ✅ E2E тест проходит полный жизненный цикл проекта
- ✅ Unit тесты покрывают >80% кода
- ✅ Integration тесты проверяют все внешние интеграции
- ✅ API документация полная и актуальная
- ✅ Deployment guide позволяет развернуть систему
- ✅ Security checklist выполнен
- ✅ Performance тесты показывают приемлемые результаты
- ✅ Example project успешно обрабатывается системой

---

## Риски и митигация

### Критические риски

1. **API лимиты и costs**
   - **Риск:** Высокие расходы на OpenAI API
   - **Митигация:** Строгие лимиты, мониторинг, оптимизация промптов

2. **Качество AI ответов**
   - **Риск:** Некорректный код или документация
   - **Митигация:** Валидация результатов, human-in-the-loop, тестирование

3. **Сложность n8n workflows**
   - **Риск:** Трудности в поддержке и отладке
   - **Митигация:** Модульность, документирование, версионирование

4. **Длительность выполнения**
   - **Риск:** Проекты могут выполняться часами
   - **Митигация:** Асинхронность, checkpoints, возможность паузы

### Средние риски

5. **Интеграционные ошибки**
   - **Риск:** Сбои в GitHub, Cursor, Telegram APIs
   - **Митигация:** Retry логика, fallback механизмы, мониторинг

6. **Производительность базы данных**
   - **Риск:** Медленные запросы при больших объемах
   - **Митигация:** Индексы, партиционирование, оптимизация запросов

7. **Security vulnerabilities**
   - **Риск:** Утечка API ключей, несанкционированный доступ
   - **Митигация:** Secure storage, аудит, access controls

## Quick Wins для MVP

1. **Начни с простейшего проекта**
   - Создай тестовый README.md для React компонента
   - Протестируй весь pipeline на минимальном примере

2. **Используй моки для разработки**
   - Mockи для OpenAI API экономят деньги на этапе разработки
   - Заглушки для GitHub позволяют тестировать локально

3. **Фокус на одном агенте**
   - Сначала полностью реализуй PR/Architecture Agent
   - Добавляй остальных агентов постепенно

4. **Минимальный UI**
   - Начни с API + Telegram Bot
   - Web UI можно добавить позже

## Альтернативы и варианты развития

### Альтернативные архитектуры
- **Serverless approach:** AWS Lambda + Step Functions вместо n8n
- **Event-driven:** Apache Kafka для координации агентов
- **Microservices:** Каждый агент как отдельный сервис

### Дополнительные возможности
- **Multi-language support:** Не только JS/TS проекты
- **Code review agent:** Автоматический review кода
- **Deployment agent:** Автоматический деплой готовых проектов
- **Monitoring agent:** Мониторинг production приложений

### Монетизация
- **SaaS модель:** Платные лимиты токенов
- **Enterprise features:** On-premise deployment, кастомные агенты
- **Marketplace:** Готовые шаблоны проектов и агентов

---

## Заключение

QuantaPilot представляет собой амбициозный проект автоматизации разработки. Ключевые факторы успеха:

1. **Поэтапная реализация** - не пытайся сделать все сразу
2. **Тестирование на каждом этапе** - качество важнее скорости
3. **Мониторинг costs** - AI API могут быть дорогими
4. **Документирование процесса** - система сложная, нужна хорошая документация
5. **Community feedback** - тестируй с реальными пользователями

Начинай с Этапа 1 и строго следуй DoD для каждого этапа. Удачи! 🚀missingFields) {
        errors.push(`Document ${name} has missing fields: ${missingFields.join(', ')}`);
      }

      // Проверка структуры markdown
      if (!this.validateMarkdownStructure(doc.content)) {
        warnings.push(`Document ${name} has invalid markdown structure`);
      }

      // JSON Schema валидация
      if (name.endsWith('.schema.json')) {
        try {
          JSON.parse(doc.content);
        } catch (e) {
          errors.push(`Schema ${name} is not valid JSON: ${e.message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateMarkdownStructure(content: string): boolean {
    // Проверка наличия заголовков, структуры и т.д.
    const hasH1 = /^#\s+/.test(content);
    const hasContent = content.trim().length > 100;
    return hasH1 && hasContent;
  }
}
```

3. **Document Lint Service**
```typescript
// src/services/DocLintService.ts
export class DocLintService {
  async lintDocuments(documents: DocumentSet): Promise<LintResult> {
    const results: LintResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    for (const [name, doc] of Object.entries(documents)) {
      const docResults = await this.lintDocument(name, doc.content);
      results.errors.push(...docResults.errors);
      results.warnings.push(...docResults.warnings);
      results.suggestions.push(...docResults.suggestions);
    }

    results.isValid = results.errors.length === 0;
    return results;
  }

  private async lintDocument(name: string, content: string): Promise<LintResult> {
    const rules = [
      this.checkRequiredSections,
      this.checkLinkValidity,
      this.checkCodeBlockSyntax,
      this.checkTableStructure,
      this.checkHeadingLevels
    ];

    const results: LintResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    for (const rule of rules) {
      const ruleResult = await rule(name, content);
      results.errors.push(...ruleResult.errors);
      results.warnings.push(...ruleResult.warnings);
      results.suggestions.push(...ruleResult.suggestions);
    }

    return results;
  }

  // Правила линтинга...
}
```

#### DoD Этапа 3:
- ✅ Чтение README.md из любого GitHub репозитория
- ✅ Генерация полного набора документов (9 файлов)
- ✅ Валидация документов проходит корректно
- ✅ Коммиты в GitHub выполняются успешно
- ✅ Issues создаются при ошибках валидации
- ✅ SHA документации вычисляется правильно
- ✅ Integration тесты с реальным GitHub repo проходят

---

### Этап 4: n8n Workflows
**Время:** 5-7 дней  
**Приоритет:** Критический

#### Задачи:
1. **Главный workflow "Project Development"**
```json
{
  "name": "Project Development",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "start-project",
        "responseMode": "responseNode"
      },
      "id": "webhook-trigger",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300]
    },
    {
      "parameters": {
        "url": "http://backend:3000/api/projects",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "repositoryUrl",
              "value": "={{$json.repository_url}}"
            },
            {
              "name": "name", 
              "value": "={{$json.project_name}}"
            }
          ]
        }
      },
      "id": "create-project",
      "name": "Create Project",
      "type": "n8n-nodes-base.httpRequest",
      "position": [460, 300]
    },
    {
      "parameters": {
        "workflowId": "document-generation"
      },
      "id": "document-generation",
      "name": "Generate Documentation",
      "type": "n8n-nodes-base.executeWorkflow",
      "position": [680, 300]
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [[{"node": "Create Project", "type": "main", "index": 0}]]
    },
    "Create Project": {
      "main": [[{"node": "Generate Documentation", "type": "main", "index": 0}]]
    }
  }
}
```

2. **Custom n8n nodes**
```typescript
// n8n/custom-nodes/QuantaPilot/agents/PRArchitectureAgent.node.ts
import { IExecuteFunctions } from 'n8n-workflow';
import { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';

export class PRArchitectureAgent implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'PR Architecture Agent',
    name: 'prArchitectureAgent',
    group: ['quantapilot'],
    version: 1,
    description: 'Execute PR/Architecture Agent tasks',
    defaults: {
      name: 'PR Architecture Agent',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Task Type',
        name: 'taskType',
        type: 'options',
        options: [
          { name: 'Analyze Requirements', value: 'analyze_requirements' },
          { name: 'Generate Documentation', value: 'generate_documentation' },
          { name: 'Create Architecture', value: 'create_architecture' },
          { name: 'Decompose Tasks', value: 'decompose_tasks' }
        ],
        default: 'analyze_requirements',
        required: true,
      },
      {
        displayName: 'Project ID',
        name: 'projectId',
        type: 'string',
        default: '',
        required: true,
      },
      {
        displayName: 'Input Data',
        name: 'inputData',
        type: 'json',
        default: '',
      }
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const taskType = this.getNodeParameter('taskType', i) as string;
      const projectId = this.getNodeParameter('projectId', i) as string;
      const inputData = this.getNodeParameter('inputData', i) as object;

      try {
        const response = await this.helpers.request({
          method: 'POST',
          url: 'http://backend:3000/api/agents/pr-architecture/execute',
          body: {
            taskType,
            projectId,
            inputData
          },
          json: true
        });

        returnData.push({
          json: {
            success: true,
            taskType,
            projectId,
            result: response.result,
            tokensUsed: response.tokensUsed,
            executionTime: response.executionTime
          }
        });

      } catch (error) {
        returnData.push({
          json: {
            success: false,
            taskType,
            projectId,
            error: error.message
          }
        });
      }
    }

    return [returnData];
  }
}
```

3. **Sub-workflows**
```json
// Document Generation Workflow
{
  "name": "Document Generation",
  "nodes": [
    {
      "parameters": {},
      "id": "start",
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "position": [240, 300]
    },
    {
      "parameters": {
        "taskType": "analyze_requirements",
        "projectId": "={{$json.projectId}}",
        "inputData": "={{$json.readme_content}}"
      },
      "id": "analyze-requirements",
      "name": "Analyze Requirements",
      "type": "quantapilot.prArchitectureAgent",
      "position": [460, 300]
    },
    {
      "parameters": {
        "taskType": "generate_documentation", 
        "projectId": "={{$json.projectId}}",
        "inputData": "={{$json.analysis}}"
      },
      "id": "generate-docs",
      "name": "Generate Documentation",
      "type": "quantapilot.prArchitectureAgent",
      "position": [680, 300]
    },
    {
      "parameters": {
        "workflowId": "document-validation"
      },
      "id": "validate-docs",
      "name": "Validate Documentation",
      "type": "n8n-nodes-base.executeWorkflow",
      "position": [900, 300]
    }
  ]
}

// Document Validation Workflow
{
  "name": "Document Validation",
  "nodes": [
    {
      "parameters": {},
      "id": "start",
      "name": "Start", 
      "type": "n8n-nodes-base.start",
      "position": [240, 300]
    },
    {
      "parameters": {
        "url": "http://backend:3000/api/documents/validate",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "projectId",
              "value": "={{$json.projectId}}"
            },
            {
              "name": "documents",
              "value": "={{$json.documents}}"
            }
          ]
        }
      },
      "id": "validate-documents",
      "name": "Validate Documents",
      "type": "n8n-nodes-base.httpRequest",
      "position": [460, 300]
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.isValid}}",
              "value2": true
            }
          ]
        }
      },
      "id": "check-validation",
      "name": "Check Validation",
      "type": "n8n-nodes-base.if",
      "position": [680, 300]
    },
    {
      "parameters": {
        "url": "http://backend:3000/api/github/create-issue",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "projectId",
              "value": "={{$json.projectId}}"
            },
            {
              "name": "title",
              "value": "Documentation Validation Failed"
            },
            {
              "name": "body",
              "value": "={{$json.errors.join('\\n')}}"
            }
          ]
        }
      },
      "id": "create-issue",
      "name": "Create GitHub Issue",
      "type": "n8n-nodes-base.httpRequest",
      "position": [680, 450]
    },
    {
      "parameters": {
        "chatId": "={{$json.telegram_chat_id}}",
        "message": "❌ Documentation validation failed for project {{$json.projectName}}. Issues created in GitHub."
      },
      "id": "notify-error",
      "name": "Notify Error",
      "type": "n8n-nodes-base.telegram",
      "position": [900, 450]
    },
    {
      "parameters": {
        "workflowId": "development-cycle"
      },
      "id": "start-development",
      "name": "Start Development",
      "type": "n8n-nodes-base.executeWorkflow",
      "position": [900, 300]
    }
  ]
}
```

4. **Error Handling и Retry Logic**
```typescript
// src/services/WorkflowService.ts
export class WorkflowService {
  private n8nClient: N8nClient;
  private retryConfig = {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  };

  async executeWorkflowWithRetry(
    workflowId: string, 
    data: any, 
    retries = 0
  ): Promise<WorkflowResult> {
    try {
      const result = await this.n8nClient.executeWorkflow(workflowId, data);
      
      if (result.finished && !result.data?.error) {
        return {
          success: true,
          data: result.data,
          executionId: result.id
        };
      }

      throw new Error(result.data?.error || 'Workflow execution failed');

    } catch (error) {
      if (retries < this.retryConfig.maxRetries) {
        const delay = this.retryConfig.initialDelay * 
          Math.pow(this.retryConfig.backoffMultiplier, retries);
        
        await this.sleep(delay);
        return this.executeWorkflowWithRetry(workflowId, data, retries + 1);
      }

      await this.handleWorkflowError(workflowId, data, error);
      throw error;
    }
  }

  private async handleWorkflowError(
    workflowId: string, 
    data: any, 
    error: Error
  ): Promise<void> {
    // Логирование ошибки
    await LogService.logError({
      component: 'WorkflowService',
      workflowId,
      error: error.message,
      data,
      timestamp: new Date()
    });

    // Уведомление в Telegram
    await TelegramService.sendErrorNotification({
      projectId: data.projectId,
      error: `Workflow ${workflowId} failed: ${error.message}`,
      actionRequired: true
    });

    // Пауза проекта
    await ProjectService.pauseProject(data.projectId, error.message);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

#### DoD Этапа 4:
- ✅ End-to-end workflow запускается и завершается успешно
- ✅ Error handling срабатывает при ошибках
- ✅ Retry логика работает корректно
- ✅ Логирование всех действий в БД
- ✅ Custom nodes корректно взаимодействуют с backend API
- ✅ Sub-workflows выполняются в правильной последовательности
- ✅ Telegram уведомления отправляются в нужные моменты
- ✅ Проект корректно паузится при ошибках

---

### Этап 5: Telegram Bot и уведомления
**Время:** 2-3 дня  
**Приоритет:** Средний

#### Задачи:
1. **Telegram Bot Service**
```typescript
// src/services/TelegramService.ts
export class TelegramService {
  private bot: TelegramBot;
  private chatSubscriptions: Map<string, string[]> = new Map(); // projectId -> chatIds

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.setupCommands();
  }

  private setupCommands(): void {
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id.toString();
      this.bot.sendMessage(chatId, `
🤖 *QuantaPilot Bot*

Добро пожаловать! Я буду уведомлять вас о ходе разработки проектов.

Доступные команды:
/subscribe <project_id> - подписаться на уведомления проекта
/unsubscribe <project_id> - отписаться от уведомлений
/status <project_id> - получить статус проекта
/continue <project_id> - продолжить приостановленный проект
/projects - список ваших проектов
/help - справка

Для начала используйте /subscribe с ID вашего проекта.
      `, { parse_mode: 'Markdown' });
    });

    this.bot.onText(/\/subscribe (.+)/, async (msg, match) => {
      const chatId = msg.chat.id.toString();
      const projectId = match?.[1];

      if (!projectId) {
        this.bot.sendMessage(chatId, '❌ Укажите ID проекта: /subscribe <project_id>');
        return;
      }

      try {
        await this.subscribeToProject(chatId, projectId);
        this.bot.sendMessage(chatId, `✅ Вы подписались на уведомления проекта ${projectId}`);
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Ошибка подписки: ${error.message}`);
      }
    });

    this.bot.onText(/\/continue (.+)/, async (msg, match) => {
      const chatId = msg.chat.id.toString();
      const projectId = match?.[1];

      if (!projectId) {
        this.bot.sendMessage(chatId, '❌ Укажите ID проекта: /continue <project_id>');
        return;
      }

      try {
        await ProjectService.continueProject(projectId);
        this.bot.sendMessage(chatId, `▶️ Проект ${projectId} возобновлен`);
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Ошибка: ${error.message}`);
      }
    });

    this.bot.onText(/\/status (.+)/, async (msg, match) => {
      const chatId = msg.chat.id.toString();
      const projectId = match?.[1];

      if (!projectId) {
        this.bot.sendMessage(chatId, '❌ Укажите ID проекта: /status <project_id>');
        return;
      }

      try {
        const status = await ProjectService.getProjectStatus(projectId);
        const message = this.formatStatusMessage(status);
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.bot.sendMessage(chatId, `❌ Проект не найден: ${projectId}`);
      }
    });
  }

  async subscribeToProject(chatId: string, projectId: string): Promise<void> {
    // Проверка существования проекта
    const project = await ProjectService.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Добавление подписки
    const subscribers = this.chatSubscriptions.get(projectId) || [];
    if (!subscribers.includes(chatId)) {
      subscribers.push(chatId);
      this.chatSubscriptions.set(projectId, subscribers);
    }

    // Сохранение в БД
    await NotificationService.createSubscription(chatId, projectId);
  }

  async sendStatusUpdate(projectId: string, status: ProjectStatus): Promise<void> {
    const message = `
🔄 *Обновление проекта*

📋 Проект: \`${status.projectName}\`
📊 Статус: ${this.getStatusEmoji(status.status)} ${status.status}
⏱️ Этап: ${status.currentMilestone}
📈 Прогресс: ${status.progress}%

${status.lastActivity ? `💡 Последнее действие: ${status.lastActivity}` : ''}
${status.nextAction ? `⏭️ Следующий шаг: ${status.nextAction}` : ''}
    `;

    await this.sendToSubscribers(projectId, message);
  }

  async sendErrorNotification(projectId: string, error: ErrorNotification): Promise<void> {
    const message = `
❌ *Ошибка в проекте*

📋 Проект: \`${error.projectName}\`
🚨 Ошибка: ${error.error}
📍 Компонент: ${error.component}
⏰ Время: ${error.timestamp.toLocaleString('ru-RU')}

${error.actionRequired ? '⚠️ *Требуется вмешательство!*' : ''}
${error.actionRequired ? 'Используйте /continue <project_id> для продолжения после устранения проблемы.' : ''}
    `;

    await this.sendToSubscribers(projectId, message);
  }

  async sendCompletionNotification(projectId: string, completion: CompletionNotification): Promise<void> {
    const message = `
🎉 *Проект завершен!*

📋 Проект: \`${completion.projectName}\`
✅ Статус: Успешно завершен
📊 Итоги:
• Задач выполнено: ${completion.tasksCompleted}
• Коммитов создано: ${completion.commitsCreated}
• Время выполнения: ${completion.executionTime}
• Токенов использовано: ${completion.tokensUsed}

🔗 Репозиторий: ${completion.repositoryUrl}
📝 Отчет: ${completion.reportUrl}

Спасибо за использование QuantaPilot! 🚀
    `;

    await this.sendToSubscribers(projectId, message);
  }

  private async sendToSubscribers(projectId: string, message: string): Promise<void> {
    const subscribers = this.chatSubscriptions.get(projectId) || [];
    
    for (const chatId of subscribers) {
      try {
        await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Failed to send message to ${chatId}:`, error);
        // Удаление недоступных подписчиков
        await this.removeInactiveSubscriber(chatId, projectId);
      }
    }
  }

  private getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      'initialized': '🆕',
      'documenting': '📝',
      'developing': '⚡',
      'testing': '🧪',
      'completed': '✅',
      'paused': '⏸️',
      'failed': '❌'
    };
    return emojis[status] || '❓';
  }

  private formatStatusMessage(status: ProjectStatus): string {
    return `
📊 *Статус проекта*

📋 Название: \`${status.projectName}\`
🔗 Репозиторий: ${status.repositoryUrl}
📊 Статус: ${this.getStatusEmoji(status.status)} ${status.status}
⏱️ Текущий этап: ${status.currentMilestone}
📈 Прогресс: ${status.progress}%

📅 Создан: ${status.createdAt.toLocaleDateString('ru-RU')}
🔄 Обновлен: ${status.updatedAt.toLocaleDateString('ru-RU')}

${status.tasksCompleted ? `✅ Задач выполнено: ${status.tasksCompleted}/${status.totalTasks}` : ''}
${status.tokensUsed ? `🎯 Токенов использовано: ${status.tokensUsed}` : ''}
    `;
  }

  private async removeInactiveSubscriber(chatId: string, projectId: string): Promise<void> {
    const subscribers = this.chatSubscriptions.get(projectId) || [];
    const updatedSubscribers = subscribers.filter(id => id !== chatId);
    this.chatSubscriptions.set(projectId, updatedSubscribers);
    
    await NotificationService.removeSubscription(chatId, projectId);
  }
}
```

2. **Notification Service**
```typescript
// src/services/NotificationService.ts
export class NotificationService {
  static async createSubscription(chatId: string, projectId: string): Promise<void> {
    await db.query(`
      INSERT INTO subscriptions (chat_id, project_id, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (chat_id, project_id) DO NOTHING
    `, [chatId, projectId]);
  }

  static async removeSubscription(chatId: string, projectId: string): Promise<void> {
    await db.query(`
      DELETE FROM subscriptions 
      WHERE chat_id = $1 AND project_id = $2
    `, [chatId, projectId]);
  }

  static async getProjectSubscribers(projectId: string): Promise<string[]> {
    const result = await db.query(`
      SELECT chat_id FROM subscriptions WHERE project_id = $1
    `, [projectId]);
    
    return result.rows.map(row => row.chat_id);
  }

  static async logNotification(
    projectId: string,
    type: string,
    recipient: string,
    message: string
  ): Promise<void> {
    await db.query(`
      INSERT INTO notifications (project_id, type, channel, recipient, message, created_at)
      VALUES ($1, $2, 'telegram', $3, $4, NOW())
    `, [projectId, type, recipient, message]);
  }
}
```

#### DoD Этапа 5:
- ✅ Bot отвечает на все команды корректно
- ✅ Подписка на проекты работает
- ✅ Уведомления приходят в нужные моменты workflow
- ✅ Команда "Continue" возобновляет приостановленные проекты
- ✅ Форматирование сообщений читаемое и информативное
- ✅ Error handling для недоступных чатов
- ✅ Логирование всех уведомлений в БД

---

### Этап 6: Мониторинг и лимиты
**Время:** 2-3 дня  
**Приоритет:** Высокий

#### Задачи:
1. **Token Usage Service**
```typescript
// src/services/TokenUsageService.ts
export class TokenUsageService {
  private static readonly LIMITS = {
    'pr_architecture': {
      hourly: 10000,
      daily: 50000,
      monthly: 500000
    },
    'development': {
      hourly: 5000,
      daily: 25000,
      monthly: 250000
    },
    'qa': {
      hourly: 3000,
      daily: 15000,
      monthly: 150000
    }
  };

  static async trackUsage(
    agentType: AgentType,
    projectId: string,
    tokens: number
  ): Promise<void> {
    const now = new Date();
    
    await db.query(`
      INSERT INTO token_usage (
        agent_type, project_id, tokens_used, timestamp, 
        hour_bucket, day_bucket, month_bucket
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      agentType,
      projectId,
      tokens,
      now,
      this.getHourBucket(now),
      this.getDayBucket(now),
      this.getMonthBucket(now)
    ]);

    // Проверка лимитов после добавления
    await this.checkLimits(agentType, projectId);
  }

  static async checkLimits(agentType: AgentType, projectId?: string): Promise<boolean> {
    const limits = this.LIMITS[agentType];
    const now = new Date();

    // Проверка часового лимита
    const hourlyUsage = await this.getUsageForPeriod(
      agentType, 
      this.getHourBucket(now),
      'hour_bucket'
    );

    if (hourlyUsage >= limits.hourly) {
      await this.pauseOnLimit(agentType, projectId, 'hourly', hourlyUsage, limits.hourly);
      return false;
    }

    // Проверка дневного лимита
    const dailyUsage = await this.getUsageForPeriod(
      agentType,
      this.getDayBucket(now),
      'day_bucket'
    );

    if (dailyUsage >= limits.daily) {
      await this.pauseOnLimit(agentType, projectId, 'daily', dailyUsage, limits.daily);
      return false;
    }

    // Проверка месячного лимита
    const monthlyUsage = await this.getUsageForPeriod(
      agentType,
      this.getMonthBucket(now),
      'month_bucket'
    );

    if (monthlyUsage >= limits.monthly) {
      await this.pauseOnLimit(agentType, projectId, 'monthly', monthlyUsage, limits.monthly);
      return false;
    }

    return true;
  }

  private static async getUsageForPeriod(
    agentType: AgentType,
    bucket: string,
    bucketColumn: string
  ): Promise<number> {
    const result = await db.query(`
      SELECT COALESCE(SUM(tokens_used), 0) as total
      FROM token_usage
      WHERE agent_type = $1 AND ${bucketColumn} = $2
    `, [agentType, bucket]);

    return parseInt(result.rows[0].total);
  }

  private static async pauseOnLimit(
    agentType: AgentType,
    projectId: string | undefined,
    period: string,
    current: number,
    limit: number
  ): Promise<void> {
    const message = `Token limit exceeded for ${agentType} agent: ${current}/${limit} (${period})`;
    
    // Логирование
    await LogService.logError({
      component: 'TokenUsageService',
      agentType,
      projectId,
      error: message,
      level: 'warn'
    });

    // Пауза проекта, если указан
    if (projectId) {
      await ProjectService.pauseProject(projectId, message);
      
      // Уведомление в Telegram
      await TelegramService.sendErrorNotification(projectId, {
        projectName: await ProjectService.getProjectName(projectId),
        component: 'TokenUsageService',
        error: message,
        actionRequired: true,
        timestamp: new Date()
      });
    }

    // Метрика для мониторинга
    await MetricsService.incrementCounter('token_limits_exceeded', {
      agent_type: agentType,
      period,
      project_id: projectId || 'unknown'
    });
  }

  private static getHourBucket(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }

  private static getDayBucket(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private static getMonthBucket(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}`;
  }
}
```

2. **Metrics Service**
```typescript
// src/services/MetricsService.ts
export class MetricsService {
  private static promClient = require('prom-client');
  private static register = new this.promClient.Registry();

  // Метрики
  private static counters = {
    projectsCreated: new this.promClient.Counter({
      name: 'quantapilot_projects_created_total',
      help: 'Total number of projects created',
      labelNames: ['status']
    }),
    
    tasksExecuted: new this.promClient.Counter({
      name: 'quantapilot_tasks_executed_total',
      help: 'Total number of tasks executed',
      labelNames: ['agent_type', 'task_type', 'status']
    }),

    tokensUsed: new this.promClient.Counter({
      name: 'quantapilot_tokens_used_total',
      help: 'Total number of tokens consumed',
      labelNames: ['agent_type', 'model']
    }),

    apiCalls: new this.promClient.Counter({
      name: 'quantapilot_api_calls_total',
      help: 'Total number of external API calls',
      labelNames: ['service', 'status']
    }),

    tokenLimitsExceeded: new this.promClient.Counter({
      name: 'quantapilot_token_limits_exceeded_total',
      help: 'Total number of token limit violations',
      labelNames: ['agent_type', 'period', 'project_id']
    })
  };

  private static gauges = {
    activeProjects: new this.promClient.Gauge({
      name: 'quantapilot_active_projects',
      help: 'Number of currently active projects',
      labelNames: ['status']
    }),

    agentStatus: new this.promClient.Gauge({
      name: 'quantapilot_agent_status',
      help: 'Current status of agents (1=active, 0=idle)',
      labelNames: ['agent_type', 'agent_id']
    }),

    taskQueueSize: new this.promClient.Gauge({
      name: 'quantapilot_task_queue_size',
      help: 'Number of tasks in queue',
      labelNames: ['agent_type']
    })
  };

  private static histograms = {
    taskExecutionTime: new this.promClient.Histogram({
      name: 'quantapilot_task_execution_duration_seconds',
      help: 'Time taken to execute tasks',
      labelNames: ['agent_type', 'task_type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300]
    }),

    apiResponseTime: new this.promClient.Histogram({
      name: 'quantapilot_api_response_duration_seconds',
      help: 'External API response times',
      labelNames: ['service'],
      buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10]
    })
  };

  static initialize(): void {
    // Регистрация всех метрик
    Object.values(this.counters).forEach(metric => this.register.registerMetric(metric));
    Object.values(this.gauges).forEach(metric => this.register.registerMetric(metric));
    Object.values(this.histograms).forEach(metric => this.register.registerMetric(metric));

    // Базовые метрики Node.js
    this.promClient.collectDefaultMetrics({ register: this.register });
  }

  static async incrementCounter(name: keyof typeof MetricsService.counters, labels: Record<string, string> = {}): Promise<void> {
    this.counters[name].inc(labels);
  }

  static async setGauge(name: keyof typeof MetricsService.gauges, value: number, labels: Record<string, string> = {}): Promise<void> {
    this.gauges[name].set(labels, value);
  }

  static async observeHistogram(name: keyof typeof MetricsService.histograms, value: number, labels: Record<string, string> = {}): Promise<void> {
    this.histograms[name].observe(labels, value);
  }

  static getMetrics(): string {
    return this.register.metrics();
  }

  // Периодическое обновление метрик из БД
  static async updateDatabaseMetrics(): Promise<void> {
    try {
      // Активные проекты
      const activeProjectsResult = await db.query(`
        SELECT status, COUNT(*) as count
        FROM projects
        WHERE status NOT IN ('completed', 'failed')
        GROUP BY status
      `);

      for (const row of activeProjectsResult.rows) {
        this.gauges.activeProjects.set({ status: row.status }, parseInt(row.count));
      }

      // Размер очередей задач
      const queueSizesResult = await db.query(`
        SELECT 
          CASE 
            WHEN type LIKE 'pr_%' THEN 'pr_architecture'
            WHEN type LIKE 'dev_%' THEN 'development' 
            WHEN type LIKE 'qa_%' THEN 'qa'
            ELSE 'unknown'
          END as agent_type,
          COUNT(*) as count
        FROM tasks
        WHERE status = 'pending'
        GROUP BY agent_type
      `);

      for (const row of queueSizesResult.rows) {
        this.gauges.taskQueueSize.set({ agent_type: row.agent_type }, parseInt(row.count));
      }

    } catch (error) {
      console.error('Failed to update database metrics:', error);
    }
  }
}
```

3. **Health Check Service**
```typescript
// src/services/HealthCheckService.ts
export class HealthCheckService {
  static async performHealthCheck(): Promise<HealthCheckResult> {
    const checks = [
      this.checkDatabase(),
      this.checkRedis(),
      this.checkOpenAI(),
      this.checkGitHub(),
      this.checkTelegram(),
      this.checkN8n()
    ];

    const results = await Promise.allSettled(checks);
    const healthData: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date(),
      checks: {},
      version: process.env.APP_VERSION || '1.0.0',
      uptime: process.uptime()
    };

    // Анализ результатов
    results.forEach((result, index) => {
      const checkName = ['database', 'redis', 'openai', 'github', 'telegram', 'n8n'][index];
      
      if (