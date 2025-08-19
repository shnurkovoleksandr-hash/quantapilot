# План по контрактам агентов.

## 1) Стандартизируй контракт

Директория: `contracts/agents/<agent>/<version>/`
Файлы:

- `request.schema.json`
- `response.schema.json`
- `error.schema.json` (общий, в `contracts/common/`)
- `step.manifest.json` (метаданные шага: таймауты, ретраи, критерии успеха)

Минимальный каркас:

```json
// contracts/common/error.schema.json
{
  "$id": "qh.error.v1",
  "type": "object",
  "required": ["code", "message"],
  "properties": {
    "code": {
      "enum": [
        "VALIDATION_ERROR",
        "PRECONDITION_FAILED",
        "RATE_LIMIT",
        "UPSTREAM_TIMEOUT",
        "TRANSIENT_NETWORK",
        "TOOL_FAILURE",
        "MODEL_OUTPUT_INVALID",
        "BUDGET_EXCEEDED",
        "FATAL"
      ]
    },
    "message": { "type": "string" },
    "details": { "type": "object" }
  }
}
```

```json
// contracts/agents/dev-writer/v1/request.schema.json
{
  "$id": "qh.dev_writer.request.v1",
  "type": "object",
  "required": [
    "agent",
    "version",
    "step",
    "input",
    "context",
    "constraints",
    "idempotency_key"
  ],
  "properties": {
    "agent": { "const": "dev-writer" },
    "version": { "const": "v1" },
    "step": { "enum": ["plan", "impl", "test"] },
    "input": { "type": "object" }, // специфичная схема под шаг
    "context": {
      "type": "object",
      "required": ["repo", "branch", "task_id", "correlation_id"],
      "properties": {
        "repo": { "type": "string" },
        "branch": { "type": "string" },
        "task_id": { "type": "string" },
        "correlation_id": { "type": "string" }
      }
    },
    "constraints": {
      "type": "object",
      "properties": {
        "budget_tokens": { "type": "integer" },
        "timeout_s": { "type": "integer" }
      }
    },
    "idempotency_key": { "type": "string" }
  }
}
```

```json
// contracts/agents/dev-writer/v1/response.schema.json
{
  "$id": "qh.dev_writer.response.v1",
  "type": "object",
  "required": ["ok", "diagnostics"],
  "properties": {
    "ok": { "type": "boolean" },
    "output": { "type": "object" }, // специфичная схема под шаг
    "error": { "$ref": "../../common/error.schema.json" },
    "diagnostics": {
      "type": "object",
      "properties": {
        "model": { "type": "string" },
        "tokens": { "type": "integer" },
        "cost_usd": { "type": "number" },
        "duration_ms": { "type": "integer" },
        "attempt": { "type": "integer" }
      }
    },
    "warnings": { "type": "array", "items": { "type": "string" } }
  }
}
```

```json
// contracts/agents/dev-writer/v1/step.manifest.json
{
  "step": "impl",
  "timeout_s": 180,
  "max_retries": 3,
  "backoff": {
    "type": "exponential",
    "base_seconds": 2,
    "max_seconds": 90,
    "jitter": true
  },
  "retry_on": [
    "RATE_LIMIT",
    "UPSTREAM_TIMEOUT",
    "TRANSIENT_NETWORK",
    "TOOL_FAILURE"
  ],
  "non_retry_on": [
    "VALIDATION_ERROR",
    "PRECONDITION_FAILED",
    "MODEL_OUTPUT_INVALID",
    "BUDGET_EXCEEDED",
    "FATAL"
  ],
  "idempotent": true,
  "success_criteria": ["$.output.files[*].path", "$.output.summary"],
  "invariants": ["$.diagnostics.tokens <= $.constraints.budget_tokens"]
}
```

## 2) Политика ретраев по шагам

- Экспоненциальный backoff с джиттером. База 2 с, максимум 90 с.
- Попытки: IO-шаги 5, генерация 2–3, идемпотентные опер: до 5.
- Авто-repair 1 раз для `MODEL_OUTPUT_INVALID` через регенерацию с системным «repair-prompt», затем стоп.

## 3) Таксономия ошибок → действие

- `RATE_LIMIT`, `UPSTREAM_TIMEOUT`, `TRANSIENT_NETWORK`, `TOOL_FAILURE` ⇒ retry.
- `VALIDATION_ERROR`, `PRECONDITION_FAILED`, `BUDGET_EXCEEDED`, `FATAL` ⇒ fail-fast.
- Все ошибки логируются с `correlation_id`, `step`, `attempt`, метриками.

## 4) Верификация и исполнение

- Pre-commit/CI: Ajv-валидация схем и примерów.
  - `npm run contracts:lint`: `ajv validate -s 'contracts/**/*.schema.json' -d 'contracts/**/examples/*.json'`

- Runtime: оркестратор валидирует вход/выход по `$id`. При невалидности:
  1. ставит `MODEL_OUTPUT_INVALID`, запускает repair-попытку,
  2. повторная невалидность ⇒ fail.

## 5) Версионирование

- Семвер в `$id` и в `version`.
- Совместимость: минор — добавления, мажор — разрыв. Оркестратор согласует поддерживаемые версии.

## 6) Минимальные требования к каждому шагу

В `step.manifest.json` обязателены: `timeout_s`, `max_retries`, `retry_on`, `idempotent`, `success_criteria`, `invariants`, `compensation` (если есть побочные эффекты).

Готов выдать шаблон для генерации этих файлов на нового агента и подключить проверку в ваш `docs:lint`.

---

# Решение по БД: минимальный, рабочий каркас под Postgres 15.

## 1) Схемы и расширения

```sql
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS pii;
CREATE SCHEMA IF NOT EXISTS audit;

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- хеши/маскирование
CREATE EXTENSION IF NOT EXISTS pg_cron;  -- ретеншн-джобы
```

## 2) Типы

```sql
CREATE TYPE app.run_status   AS ENUM ('queued','running','ok','error','canceled');
CREATE TYPE app.event_level  AS ENUM ('info','warn','error');
```

## 3) Ядро данных

```sql
CREATE TABLE app.project (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_url TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.task (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES app.project(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                      -- e.g. "feature","bugfix","docgen"
  status TEXT NOT NULL DEFAULT 'queued',   -- бизнес-статус задачи
  priority INT DEFAULT 0,
  budget_tokens INT,
  parameters JSONB NOT NULL DEFAULT '{}',
  created_by UUID,                         -- ссылку на pii.user.user_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES app.task(id) ON DELETE CASCADE,
  step TEXT NOT NULL,                      -- "plan"|"impl"|"test"|...
  attempt INT NOT NULL DEFAULT 1,
  status app.run_status NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  diagnostics JSONB NOT NULL DEFAULT '{}', -- model,tokens,duration_ms...
  cost_usd NUMERIC(10,4) DEFAULT 0,
  tokens INT DEFAULT 0,
  correlation_id TEXT
);

CREATE TABLE app.artifact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES app.task(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes BIGINT,
  branch TEXT,
  pr_number INT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, path, sha256)
);

-- Логи: партиционирование по дате
CREATE TABLE app.event_log (
  id BIGSERIAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  correlation_id TEXT,
  level app.event_level NOT NULL,
  code TEXT,
  message TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Пример текущего раздела
CREATE TABLE app.event_log_2025_08 PARTITION OF app.event_log
FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE app.cost_daily (
  day DATE NOT NULL,
  project_id UUID NOT NULL REFERENCES app.project(id) ON DELETE CASCADE,
  tokens BIGINT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (day, project_id)
);
```

## 4) Индексы (минимум)

```sql
CREATE INDEX ON app.task (project_id, status);
CREATE INDEX ON app.run (task_id, status, step);
CREATE INDEX ON app.run (correlation_id);
CREATE INDEX ON app.artifact (task_id);
CREATE INDEX app_event_log_created ON app.event_log_2025_08 (created_at);
CREATE INDEX app_event_log_corr ON app.event_log_2025_08 (correlation_id);
CREATE INDEX app_event_log_gin ON app.event_log_2025_08 USING GIN (data);
```

## 5) PII-контур и каталог данных

```sql
-- Классификация PII: 0-none,1-low,2-med,3-high
CREATE TABLE audit.data_catalog (
  table_name TEXT NOT NULL,
  column_name TEXT NOT NULL,
  pii_level SMALLINT NOT NULL DEFAULT 0,
  category TEXT,              -- email, id, ip, financial, etc.
  purpose TEXT,               -- зачем храним
  retention_days INT,         -- срок хранения
  legal_basis TEXT,           -- контракт, легитимный интерес и т.д.
  PRIMARY KEY (table_name, column_name)
);

CREATE TABLE pii."user" (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  telegram_id TEXT,
  github_username TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Маскированное представление для UI
CREATE VIEW pii.user_redacted AS
SELECT
  user_id,
  regexp_replace(email, '(^.).+(@.+$)', '\1***\2') AS email,
  left(telegram_id,3)||'***' AS telegram_id,
  github_username,
  display_name,
  created_at
FROM pii."user";

-- RLS: доступ только сервисной роли
ALTER TABLE pii."user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY pii_service_only ON pii."user"
  USING (current_user = 'svc_quanta'); -- создайте роль svc_quanta и выдайте ей SELECT/INSERT/UPDATE
```

## 6) Ретеншн и обслуживание

```sql
-- Удаляем логи старше 90 дней по разделам
SELECT cron.schedule('logs_retention_weekly',
  '0 3 * * 0',  -- каждое воскресенье 03:00
$$
DO $$
DECLARE part RECORD;
BEGIN
  FOR part IN
    SELECT relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='app' AND relname LIKE 'event_log_%'
  LOOP
    EXECUTE format($f$
      SELECT max(created_at) < now() - interval '90 days' FROM app.%I
    $f$, part.relname) INTO STRICT;
    -- если раздел старый — дропаем
    EXECUTE format('DROP TABLE IF EXISTS app.%I', part.relname);
  END LOOP;
END$$
$$);

-- Агрегация суточных затрат
SELECT cron.schedule('cost_rollup_hourly','15 * * * *',
$$
INSERT INTO app.cost_daily(day, project_id, tokens, cost_usd)
SELECT date_trunc('day', started_at)::date, t.project_id,
       sum(r.tokens), sum(r.cost_usd)
FROM app.run r
JOIN app.task t ON t.id=r.task_id
WHERE started_at >= now() - interval '36 hours'
GROUP BY 1,2
ON CONFLICT (day, project_id) DO UPDATE
SET tokens = EXCLUDED.tokens, cost_usd = EXCLUDED.cost_usd;
$$);
```

## 7) Миграции

- Инструмент: **dbmate** или **Prisma Migrate** (если TS-стек).
- Скрипты:

```json
// package.json
{
  "scripts": {
    "db:up": "dbmate up",
    "db:down": "dbmate down",
    "db:new": "dbmate new",
    "db:lint": "sqlfluff lint db/migrations --dialect=postgres"
  }
}
```

## 8) Правила

- PII хранится только в `pii.*`. В `app.*` — только внешние ключи `user_id`.
- Сырые логи без PII. Если необходимо — хешируй идентификаторы: `digest(value, 'sha256')`.
- Бинарные артефакты в VCS/объектном хранилище, не в БД.
- Любой новый столбец проходит регистрацию в `audit.data_catalog` с `pii_level`, `purpose`, `retention_days`.

---

# Готовый каркас SLI/SLO/SLA и бюджетов.

## 1) Классы задач

- `docgen` — генерация документации.
- `feature_xs` — малая фича/фикс.
- `feature_s` — стандартная фича.

## 2) SLI (из БД и оркестратора)

- `e2e_lead_time_p95` — p95 от `task.queued_at` до PR открыт.
- `step_latency_p95[step]` — p95 длительности шага.
- `success_rate` — `ok/(ok+error)` по классу.
- `pr_quality_rate` — PR прошёл CI+docs\:lint без правок.
- `cost_p95_usd`, `tokens_p95`.
- `queue_start_time_p95` — от очереди до старта.
- Инциденты: `MTTR`, `MTBF`.

## 3) Цели (SLO) и бюджеты по шагам

### Энд-ту-энд по классам

- `docgen`: `e2e_lead_time_p95 ≤ 25 мин`, `success_rate ≥ 95%`, `cost_p95 ≤ $0.70`.
- `feature_xs`: `e2e_lead_time_p95 ≤ 40 мин`, `success_rate ≥ 90%`, `cost_p95 ≤ $1.2`.
- `feature_s`: `e2e_lead_time_p95 ≤ 60 мин`, `success_rate ≥ 85%`, `cost_p95 ≤ $2.0`.

### Бюджет времени и тайм-ауты по шагам (feature_s)

| Шаг    |    p95 цель | timeout_s | retries | tokens_budget |
| ------ | ----------: | --------: | ------: | ------------: |
| plan   |       4 мин |       300 |       2 |            6k |
| impl   |      20 мин |      1500 |       2 |           20k |
| test   |       8 мин |       600 |       2 |            8k |
| doc    |       4 мин |       300 |       1 |            3k |
| pr     |       4 мин |       300 |       1 |            1k |
| buffer | 20% от сумм |         — |       — |             — |

Правила ретраев: только на `RATE_LIMIT, UPSTREAM_TIMEOUT, TRANSIENT_NETWORK, TOOL_FAILURE`. Иначе fail-fast.

## 4) SLA (внешнее)

- Доступность API/оркестратора: `99.5%/мес`.
- `queue_start_time_p95 ≤ 5 мин`.
- P1 инцидент: ACK ≤ 5 мин, восстановление ≤ 30 мин. P2: ACK ≤ 15 мин, восстановление ≤ 2 ч.

## 5) MTTR/MTBF (внутренние цели)

- `MTTR P1 ≤ 20 мин`, `MTTR P2 ≤ 90 мин`.
- `MTBF критических отказов пайплайна ≥ 72 ч`.

## 6) Политика error-budget

- Для `success_rate` класс-месяц: бюджет = `1 - SLO`. При расходе >50% — код-фриз фич, только стабилизация. >100% — блок новых задач класса до восстановления.

## 7) Реализация в конфиге (в репо)

`ops/slo.yml`:

```yaml
windows:
  reporting: 30d         # агрегирование SLO
  alert_eval: 1h         # как часто считаем алерты
task_classes:
  - id: docgen
    slo:
      e2e_lead_time_p95: "≤ 25m"
      success_rate: "≥ 95%"
      cost_p95_usd: "≤ 0.70"
  - id: feature_xs
    slo:
      e2e_lead_time_p95: "≤ 40m"
      success_rate: "≥ 90%"
      cost_p95_usd: "≤ 1.20"
  - id: feature_s
    slo:
      e2e_lead_time_p95: "≤ 60m"
      success_rate: "≥ 85%"
      cost_p95_usd: "≤ 2.00"
error_budget:
  metric: success_rate
  policy:
    warn: "spent >= 50%"   # код-фриз фич
    freeze: "spent >= 100%"# блок новых задач класса
sli:
  - id: e2e_lead_time_p95
    source: db
    query_ref: app.sql.sli.e2e_lead_time_p95
  - id: step_latency_p95
    source: db
    query_ref: app.sql.sli.step_latency_p95
  - id: success_rate
    source: db
    query_ref: app.sql.sli.success_rate
  - id: pr_quality_rate
    source: db
    query_ref: app.sql.sli.pr_quality_rate
  - id: cost_p95_usd
    source: db
    query_ref: app.sql.sli.cost_p95_usd
  - id: tokens_p95
    source: db
    query_ref: app.sql.sli.tokens_p95
  - id: queue_start_time_p95
    source: db
    query_ref: app.sql.sli.queue_start_time_p95
alerts:
  routes:
    - channel: telegram
      to: ${TELEGRAM_CHAT_ID}
      on: [warn, freeze]
```

## 8) Привязка к рантайму

- Дублируй целевые `timeout_s`, `tokens` в `contracts/agents/*/step.manifest.json`.
- Оркестратор убивает шаг по `timeout_s` и по `tokens`/`cost` лимиту.
- Алёрты: отклонение `step_latency_p95 > 1.2×целевого 15 мин+`, `success_rate` за 1 ч ниже цели на 5 п.п., `queue_start_p95 > SLA`.

---

# По безопасности: внедряем threat-model, RBAC, ротацию ключей и audit trail.

## 1) Артефакты в репо

```
ops/security/threat-model.md
ops/security/rbac.yml
ops/security/secrets-rotation.md
ops/security/audit.md
```

## 2) Threat model (STRIDE, с мэппингом на контрмеры)

- Активы: GitHub репо, креды n8n, БД (pii/app/audit), токены LLM, Telegram бот.
- Акторы: оператор, агенты, CI, внешние API.
- Границы доверия: интернет↔оркестратор, оркестратор↔БД, оркестратор↔n8n creds, оркестратор↔GitHub.
- Топ-риски→контрмеры:
  S: подмена агента→ взаимная аутентификация по mTLS/JWT, `correlation_id`, подпись запросов.
  T: эскалация через n8n creds→ разнесённые креды per-agent, read-only по умолчанию.
  R: повтор шага→ `idempotency_key`, дедуп по нему.
  I: утечка PII→ RLS на `pii.*`, masked views, запрет прямого доступа агентам.
  D: утрата логов→ audit hash-chain + offsite реплика.
  E: исп. дорогих моделей злоумышленником→ бюджет per-step, stop-rules, алёрты.

## 3) RBAC (Postgres + n8n)

### Postgres роли и права (минимум)

```sql
-- роли
CREATE ROLE svc_orchestrator LOGIN;
CREATE ROLE agent_dev_writer LOGIN;
CREATE ROLE agent_qa LOGIN;
CREATE ROLE ops_readonly NOLOGIN;
CREATE ROLE sec_auditor NOLOGIN;

-- app.*
GRANT USAGE ON SCHEMA app TO svc_orchestrator, agent_dev_writer, agent_qa;
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA app TO svc_orchestrator;
GRANT SELECT,INSERT ON app.run, app.event_log TO agent_dev_writer, agent_qa;
GRANT SELECT ON app.project, app.task, app.artifact TO agent_dev_writer, agent_qa;

-- pii.* строго
REVOKE ALL ON SCHEMA pii FROM PUBLIC;
GRANT USAGE ON SCHEMA pii TO svc_orchestrator;
GRANT SELECT ON pii.user_redacted TO agent_dev_writer, agent_qa; -- только маскированный вид
-- прямой SELECT на pii."user" только svc_orchestrator

-- audit.*
GRANT USAGE ON SCHEMA audit TO svc_orchestrator, sec_auditor;
GRANT INSERT ON audit.agent_action TO svc_orchestrator;
GRANT SELECT ON audit.agent_action TO sec_auditor, ops_readonly;
```

### n8n credentials

- Разделить креды по ролям: `gh_app_dev_writer`, `gh_app_qa`, `tg_ops_notify`, `llm_dev_writer`, `llm_qa`.
- Запрет шаринга между воркфлоу. Включить Owner-based access control.

## 4) Ротация ключей (dual-secret pattern)

Политика в `ops/security/secrets-rotation.md`:

- Периодичность: OpenAI/LLM — 30 дней; Telegram — 90; GitHub App private key — 90; SOPS/age — 180; DB пароли — 180.
- Шаги ротации без даунтайма:
  1. Выпустить **новый** секрет (v2).
  2. Загрузить в секрет-хранилище (SOPS/KMS) как `KEY_NAME_v2`, не удаляя `v1`.
  3. Обновить n8n/env на поддержку v1|v2.
  4. Переключить оркестратор на v2, мониторить 24 ч.
  5. Отозвать v1 в провайдере.
  6. Закоммитить PR с удалением `*_v1` из SOPS.

- GitHub App: создать второй private key, перекатить, удалить старый.
- SOPS: `age` ключи ротуются с добавлением нового `recipient`, затем удаление старого.

## 5) Audit trail действий агентов

### Схема и хеш-цепочка

```sql
CREATE TABLE audit.agent_action (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent TEXT NOT NULL,          -- dev-writer, qa, ...
  step TEXT NOT NULL,           -- plan|impl|test...
  correlation_id TEXT NOT NULL,
  action TEXT NOT NULL,         -- "edit_files","open_pr","post_comment"
  target TEXT,                  -- repo/path/pr#
  request_hash CHAR(64) NOT NULL,
  response_hash CHAR(64),
  status TEXT NOT NULL,         -- ok|error
  error_code TEXT,
  prev_hash CHAR(64),           -- из пред. записи по correlation_id
  hash CHAR(64) NOT NULL        -- SHA256(всех полей + prev_hash)
);

CREATE INDEX ON audit.agent_action (correlation_id, ts);
```

Правила:

- Логировать перед и после побочного эффекта.
- Хешировать payload: `SHA256(jsonb_pretty(request)::text)`. Пэйлоады держать вне БД (объектное хранилище), в БД — только хеши и ссылки.
- Фиксировать `who`: `session_user` и `agent` в каждом вызове.
- Алёрты при пропуске звена цепочки или дубликате `action` без `idempotency_key`.

## 6) Политики GitHub/CI

- GitHub App c минимумом скоупов: `contents:read`, `pull_requests:write`, `checks:read`. Запрет `workflows:write`.
- Обязательные статус-чеки на ветке: Docs Lint, Tests, Security Scan. Без них merge запрещён.
- Все коммиты агентов подписаны (GPG/Sigstore).

## 7) Сетевой периметр

- Исходящий трафик агентов только через egress-прокси с allow-list доменов (GitHub, LLM API, Telegram).
- mTLS между оркестратором и сервисами.
- JWT на шаги: короткий TTL, audience=оркестратор, `correlation_id` в claims.

## 8) Операционные процедуры

- Playbook инцидента утечки: ключ-ревок + форс-ротация по классу, отзыв GitHub key, отключение агента в RBAC, уведомление в Telegram.
- Еженедельный отчёт `audit.md`: топ-действия, аномалии, попытки с невалидным JWT, несоответствия RBAC.

---

# Стратегия отката и очистки артефактов.

## 1) Политика и скрипты

- `ops/rollback/policy.md` — условия отката, RACI, чек-лист.
- `ops/rollback/run.sh` — откат к LKG SHA.
- `ops/cleanup/after_rollback.sh` — чистка артефактов по `correlation_id`.

## 2) Точки фиксации перед merge

- Перед авто-merge метить `LKG`: `git tag -a lkg-$(date +%Y%m%d-%H%M) $CURRENT_SHA`.
- Сохранять `deploy/current.sha` и `deploy/previous.sha` в артефактах CI.

## 3) Код: два пути отката

- Быстрый: деплой на `deploy/previous.sha` из артефакта CI.
- Структурный: `git revert -m 1 <merge_sha>` ➝ авто-PR “Revert #<PR>” ➝ CI ➝ деплой.

## 4) Автоматизация GitHub

- Лейбл `rollback:request` на PR запускает workflow `ops/rollback.yml`:
  - вычисляет `<merge_sha>`,
  - создаёт PR `revert`,
  - на прод выкатывает `deploy/previous.sha` до мержа revert-PR.

## 5) Feature flags и canary

- Все новые фичи за флагом `ff_<name>` (env + конфиг).
- Горячий kill-switch: `ff_<name>=off` без релиза.
- Канареечный процент 10% на 15 мин перед полным rollout.

## 6) Миграции БД

- Только **reversible** миграции. Пара `up/down` обязательна.
- Правило two-step: сначала add-only + совместимость, затем включение фичи.
- При откате: `db:down 1` для последнего релиза, затем кодовый откат.
- Деструктивные миграции требуют ручного Gate.

## 7) Очистка артефактов

- Git: `git revert` восстановит файлы.
- S3/объектка: удалять пути с префиксом `/artifacts/<correlation_id>/`.
- БД:

  ```sql
  DELETE FROM app.artifact WHERE task_id IN (
    SELECT id FROM app.task WHERE correlation_id = $1
  );
  DELETE FROM app.run WHERE task_id IN (...);
  ```

- Кэши CI/npm: инвалидация по SHA. Док-кэши — по `pr_number`.

## 8) Триггеры отката

- Авто: PR не прошёл health-чеки, SLI деградация > X% 15 мин, алёрт P1.
- Ручной: кнопка “Rollback to previous” в ops-UI запускает `ops/rollback/run.sh`.

## 9) Post-rollback

- Заморозка авто-мержей 2 часа.
- RCA с таймлайном и диффом.
- Удаление лейбла `rollback:request`, закрытие тикета, обновление `lkg-*`.

---

# Рамки стоимости: конфиг + префлайт + рантайм-стопы.

## 1) Конфиг

`ops/cost.yml`

```yaml
version: v1
daily_budget_usd: 20
burst:
  per_min_tokens: 60_000
  per_hour_usd: 5
task_caps:
  default: { usd: 3, tokens: 60_000 }
  docgen: { usd: 1, tokens: 25_000 }
agent_caps:
  dev-writer: { usd: 2, tokens: 40_000 }
  qa: { usd: 1, tokens: 20_000 }
step_caps:
  plan: { usd: 0.25, tokens: 6_000, max_output_tokens: 800 }
  impl: { usd: 1.20, tokens: 20_000, max_output_tokens: 2_000 }
  test: { usd: 0.40, tokens: 8_000, max_output_tokens: 1_000 }
expensive_prompt_policy:
  max_input_tokens: 8_000
  projected_cost_stop_usd: 0.60 # hard stop
  projected_cost_gate_usd: 0.35 # требует ручного ACK
  repair_attempts_max: 1
model_prices_usd_per_1k:
  gpt-5-large: { input: 0.005, output: 0.015 }
  gpt-5: { input: 0.003, output: 0.009 }
downshift:
  prefer: gpt-5
  when_input_tokens_gt: 4_000
```

## 2) Префлайт-оценка (обязательна перед каждым шагом)

- Оценить `input_tokens`, `max_output_tokens` → `projected_cost`.
- Сравнить с `step_caps`, `agent_caps`, `task_caps`, `daily_budget_usd`, `burst`.
- Действия:
  1. Если `projected_cost > projected_cost_stop_usd` или `input_tokens > max_input_tokens` → отказ (`BUDGET_EXCEEDED`).
  2. Если `> projected_cost_gate_usd` → пауза и запрос ACK.
  3. Автодауншифт модели по правилу `downshift`.
  4. Сжать контекст: remove duplicates, trim history, RAG top-k=6, summary до N токенов.
  5. Задать `max_output_tokens` из `step_caps`.

Псевдокод:

```ts
if est.cost > caps.step.stop || est.input_tokens > caps.policy.max_input_tokens:
  fail("BUDGET_EXCEEDED")
if est.cost > caps.policy.gate: requireHumanAck()
model = maybeDownshift(model, est.input_tokens)
ctx = compressContext(ctx)
setMaxOutput(stepCaps.max_output_tokens)
```

## 3) Рантайм-ограничения

- Счётчики по `correlation_id`, `task_id`, `agent`, и по суткам.
- Алёрт на 80% лимита. Жёсткий стоп на 100% (`BUDGET_EXCEEDED`).
- `burst`: стоп, если за минуту > `per_min_tokens` или за час > `per_hour_usd`.
- `repair_attempts_max` из конфига. Повторная невалидность → стоп.

## 4) Политика «дорогих» промптов

Триггеры:

- `input_tokens > 4k`, `projected_cost > 0.35$`, повтор шага, включён Code Interpreter/вызовы внешних тулов.
  Митигировать в порядке:

1. Смена модели на `downshift.prefer`.
2. Урезка контекста до последних N сообщений + RAG top-k.
3. Снижение `max_output_tokens`.
4. Запрет инструментов для шага (если не критично).
5. Требование ACK.

## 5) Интеграция с контрактами

- В `contracts/*/step.manifest.json` добавить:

```json
{ "tokens_budget": 20000, "max_output_tokens": 2000, "hard_cost_stop_usd": 0.6 }
```

- Оркестратор проверяет инвариант: `actual.tokens <= tokens_budget`.

## 6) Линтинг промптов

- `scripts/promptlint.mjs`: проверка шаблонов на `{{max_output_tokens}}`, отсутствие длинных «всепроектных» контекстов, запрет chain-of-thought.
- CI-правило: блокировать PR с промптами, где `est.projected_cost > step_caps.stop`.

---

# Каркас воспроизводимости: фиксации, хэши, снапшоты, реплей.

## 1) Артефакты

```
ops/inference.yml          # реестр моделей и параметров по шагам
prompts/<area>/<name>.yaml # реестр промптов (id, ver, template, tests)
ops/repro/replay.sh        # реплей по manifest
```

## 2) Пин параметров модели

`ops/inference.yml`

```yaml
version: v1
defaults:
  temperature: 0
  top_p: 1
  presence_penalty: 0
  frequency_penalty: 0
  max_output_tokens: 2000
steps:
  plan: { model: gpt-5-2025-07-15, max_output_tokens: 800 }
  impl: { model: gpt-5-2025-07-15, max_output_tokens: 2000 }
  test: { model: gpt-5-2025-07-15, max_output_tokens: 1000 }
```

Правила: код/тесты — `temperature=0`; тексты — ≤0.3. Версию модели указывать с точной датой/ревизией провайдера.

## 3) Реестр промптов с фиксацией

`prompts/dev-writer/impl.yaml`

```yaml
id: qw.dev_writer.impl
version: 3
template: |
  <system>...</system>
  <user>{{task_spec}}</user>
vars: [task_spec]
tests:
  - name: smoke
    input: { task_spec: 'Add /health endpoint' }
fingerprint: auto # SHA256(template+vars+version)
```

На рантайме хранить: `prompt_id`, `prompt_version`, `prompt_hash`, `render_hash` (после подстановки vars).

## 4) Контракты шагов → фикс параметров

В `contracts/*/step.manifest.json` добавить:

```json
{
  "model": "gpt-5-2025-07-15",
  "params": { "temperature": 0, "top_p": 1, "max_output_tokens": 2000 },
  "prompt_id": "qw.dev_writer.impl",
  "prompt_version": 3
}
```

## 5) RAG детерминизм

- Снапшот знаний: `data/snapshots/<yyyy-mm-dd>/` (сырые docs).
- Индекс: `rag/index@<snapshot_id>`, фикс: `emb_model`, `chunker_version`, `chunk_size/overlap`, `top_k`, `reranker_version`.
- Дет. сортировка: `ORDER BY score DESC, doc_id ASC, chunk_id ASC`.

## 6) Логирование для реплея

В `app.run.diagnostics` записывать:

```
model, model_version, params{temperature,top_p,max_output_tokens},
prompt_id, prompt_version, prompt_hash, render_hash,
rag{snapshot_id, emb_model, chunker_version, top_k, reranker_version},
tools_hash, tokenizer_version, provider_region
```

Если провайдер поддерживает `seed` — сохранять `seed` и использовать его.

## 7) Реплей

При завершении шага сохранять `repro.json` (артефакт):

```json
{ "input": {...}, "prompt_rendered": "...", "model": "...", "params": {...}, "rag": {...} }
```

`ops/repro/replay.sh --run-id <UUID>` поднимает окружение той же версии кода, читает `repro.json`, запускает шаг повторно.

## 8) CI-правила

- Блокировать PR, если изменены промпты без инкремента `version` или меняется `defaults` без обновления `step.manifest.json`.
- Автотест: `promptctl lint && promptctl fingerprint --verify`.

---

# Политика качества: цели, типы тестов, приёмка — вшиваем в репо.

## 1) Политика и цели

`ops/quality.yml`

```yaml
version: v1
coverage:
  global:   { lines: 80, funcs: 75, branches: 70, statements: 80 }
  core:     { lines: 90, branches: 80 }   # пакеты с label=core
testing_required:
  docgen:    [unit, snapshot, neg, acc]
  feature_xs:[unit, integration, neg, acc]
  feature_s: [unit, integration, e2e, neg, acc]
neg_matrix:
  http:   ["4xx контракт","таймауты","повтор запроса","невалидный JSON"]
  db:     ["уникальные ключи","транзакция rollback","RLS отказ"]
  agents: ["MODEL_OUTPUT_INVALID","RATE_LIMIT","BUDGET_EXCEEDED"]
acceptance:
  common: ["docs:lint ok","security scan ok","no P1/P2 lints","SLO step_latency<=p95"]
  api:    ["контракты OpenAPI пройдены","idempotency_key учитывается"]
  ui:     ["a11y базовый","перекрытие локалей","перф LCP<=2.5s preview"]
```

## 2) Структура тестов

```
/tests/unit/**           # чистая логика
/tests/integration/**    # БД, внешние API через testcontainers/mocks
/tests/e2e/**            # playwright против preview
/tests/neg/**            # негативные кейсы по матрице
/tests/acc/**            # критерии приёмки по типу фич
```

## 3) Покрытие и гейты CI

`package.json`

```json
{
  "scripts": {
    "test:unit": "vitest run --coverage.enabled",
    "test:int": "vitest run -c vitest.int.config.ts",
    "test:e2e": "playwright test",
    "test:neg": "vitest run -c vitest.neg.config.ts",
    "test:acc": "node scripts/acceptance.mjs",
    "qa:all": "npm run test:unit && npm run test:int && npm run test:neg && npm run test:acc",
    "qa:merge": "node scripts/quality-gate.mjs ops/quality.yml coverage/coverage-final.json"
  }
}
```

`.github/workflows/ci.yml` — шаг `qa:merge` падает, если метрики ниже `ops/quality.yml`.

## 4) Интеграционные тесты

- Postgres: **testcontainers** с миграциями up/down.
- HTTP-внешка: **MSW/Nock/WireMock**.
- GitHub/TG: локальные фейки с контрактными фикстурами.

## 5) Негативные тесты

- Каталог: `tests/neg/catalog.json` со связкой на `neg_matrix`.
- Каждому шагу пайплайна минимум 1 негативный сценарий из матрицы.
- Проверка: корректный `error.code`, ретраи/stop по политике.

## 6) Критерии приёмки по типам фич

### docgen

- Golden-files совпадают (`__snapshots__`).
- `docs:lint` и фронтматтер-схемы — ok.

### feature_xs

- ≥1 интеграционный тест маршрута/компонента.
- Контракты API пройдены, миграций нет или reversible.
- Негативный тест на ошибку валидации.

### feature_s

- Контрактные тесты API + e2e smoke (create→use→persist).
- Миграции add-only, обратимость проверена.
- Перф/а11y цели из `acceptance.common/ui`.

## 7) Автоматизация приёмки

`scripts/acceptance.mjs`:

- Читает `ops/quality.yml` и тип фичи из PR-лейбла (`type:docgen|feature_xs|feature_s`).
- Проверяет обязательные сьюты и чек-листы, формирует комментарий в PR.
- Блокирует merge при невыполнении.

## 8) Политика флейков

- Метка `@flaky` ⇒ quarantine-джоб, не влияет на merge > 7 дней нельзя.
- SLA: 0 флейков в core-пакетах; иначе — блок фич до фикса.

## 9) Контроль покрытия

- Минимум per-pkg. Пакеты с label=`core` обязаны достигать порогов `coverage.core`.
- Отчёт в PR: дельта покрытия, красная зона по файлам.

---

# Политика CI/CD: зоны ответственности, «жёсткие стопы», и автоматические проверки.

## 1) Что система имеет право менять

`ops/cicd-policy.md`

```yaml
version: v1
agent_write_allowlist:
  - src/** # код приложения
  - tests/** # тесты
  - docs/** # пользовательская и dev-документация
  - .github/PULL_REQUEST_TEMPLATE.md
  - .github/labels.yml
agent_write_denylist:
  - .github/workflows/** # любые workflow
  - ops/** # SLO/стоимость/безопасность/репро
  - contracts/** # схемы контрактов
  - db/migrations/** # миграции БД
  - package*.json # скрипты и зависимости
  - Dockerfile docker/** # контейнеры и рантайм
  - infra/** # IaC, k8s, terraform
```

## 2) CODEOWNERS (только люди)

`CODEOWNERS`

```
.github/workflows/*   @ops-leads
ops/*                 @ops-leads
contracts/*           @arch-leads
db/migrations/*       @db-leads
infra/*               @infra-leads
*                     @eng-leads
```

## 3) «Жёсткие стопы» для защищённых путей

`.github/workflows/policy-enforcer.yml`

```yaml
name: policy/enforcer
on: [pull_request]
jobs:
  paths:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tj-actions/changed-files@v45
        id: cf
      - name: Block bot on protected paths
        run: |
          PROTECTED='^(\.github/workflows/|ops/|contracts/|db/migrations/|infra/|Dockerfile|docker/|package(-lock)?\.json)'
          for f in ${{ steps.cf.outputs.all_changed_files }}; do
            if [[ "$f" =~ $PROTECTED ]] && [[ "${{ github.actor }}" == "quantapilot-bot" ]]; then
              echo "Bot cannot change protected file: $f"; exit 1
            fi
          done
      - name: Require label for workflow edits
        if: contains(steps.cf.outputs.all_changed_files, '.github/workflows/')
        run: |
          gh pr view ${{ github.event.pull_request.number }} --json labels -q '.labels[].name' | \
          grep -qx 'ops:workflow-change' || { echo "Missing ops:workflow-change label"; exit 1; }
```

## 4) Триггеры workflow только для разрешённых путей

Пример для CI:

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'docs/**'
      - '!ops/**'
      - '!.github/workflows/**'
```

## 5) Branch protection (GitHub)

- Require status checks: `policy/enforcer`, `quality-gate`, `security-scan`, `docs-lint`.
- Require CODEOWNERS review.
- Disallow force-push. Linear history.
- Restrict who can push to `main`: только GitHub App «quantapilot-bot» через PR.

## 6) Процесс изменения workflow и «жёсткие стопы»

- Любой PR, затрагивающий `.github/workflows/**`:
  - лейбл `ops:workflow-change` обязателен;
  - минимум 2 ревью из `@ops-leads`;
  - запрет авто-merge и запрет от бота;
  - деплой только через GitHub **Environment** `ci-admin` с ручным Approver.

- Изменения `ops/*`, `contracts/*`, `db/migrations/*`:
  - запускают отдельный pipeline `change-control.yml`, который:
    - публикует diff-политику;
    - требует чек-лист ACK (SLO/стоимость/безопасность/rollback);
    - без чек-листа — fail.

## 7) Авто-PR от бота

- Бот помечает PR: `source:agent/<name>`, `type:docgen|feature_xs|feature_s`.
- Auto-merge разрешён только если:
  - изменены файлы из `agent_write_allowlist`;
  - все обязательные статус-чеки зелёные;
  - нет конфликтов и нет затронутых защищённых путей.

## 8) Прехуки на уровне репо (скрипт-страж)

`scripts/ci/guard.mjs` — используется в `policy/enforcer`:

- валидирует diff против `ops/cicd-policy.md`;
- падает, если агент меняет denylist;
- печатает сводку изменённых файлов и причину блока.

## 9) Прозрачность

PR-шаблон добавляет блок:

```
## Change control
- [ ] Protected paths not touched OR required labels+approvals present
- [ ] Rollback plan attached for ops/contracts/db changes
```

---

# Решение: фиксируем роли, потоки, эндпоинты, мок-данные, RBAC и аудит.

## Роли (пример-минимум)

- `viewer`: только чтение.
- `operator`: create task, pause/retry/continue, ACK дорогих шагов, toggle feature flags.
- `approver`: всё operator + approve/reject gate, approve workflow edits.
- `admin`: всё + управление пользователями/ролями, лимитами, ключами.
- `auditor`: доступ ко всем логам/аудиту, без действий.

## Ключевые потоки UI

1. **Старт задачи**: Dashboard → New Task → form(repo, feature_type, caps) → Create → Task view с live-logs.
2. **Gate-approval**: Gate queue → Diff/Checks → Approve/Rework → авто-PR или возврат в план.
3. **Инцидент**: Task view → Pause/Retry/Continue → если P1 → Rollback to previous → Confirm.
4. **Дорогой промпт**: Prompt Guard modal (оценка стоимости) → ACK или Edit caps → Resume.
5. **Фичфлаги**: Flags → toggle `ff_*` → Reason → Apply → автокоммент в PR.

## Эндпоинты управления (REST)

`openapi/ui-admin.yml`

```yaml
paths:
  /tasks: { post: { operationId: createTask, requestBody: {...}, responses: {201:{}} }, get: {operationId: listTasks} }
  /tasks/{id}: { get: {operationId: getTask} }
  /tasks/{id}/pause:   { post: {operationId: pauseTask} }
  /tasks/{id}/retry:   { post: {operationId: retryTask} }
  /tasks/{id}/continue:{ post: {operationId: continueTask} }

  /gates/pending: { get: {operationId: listGates} }
  /gates/{id}/approve: { post: {operationId: approveGate} }
  /gates/{id}/reject:  { post: {operationId: rejectGate} }

  /prompts/{runId}/ack: { post: {operationId: ackExpensivePrompt} }

  /flags: { get: {operationId: listFlags} }
  /flags/{name}/toggle: { post: {operationId: toggleFlag} }

  /rollback/{prNumber}: { post: {operationId: rollbackPR} }

  /audit/actions: { get: {operationId: listOperatorActions} }
  /metrics/slis:  { get: {operationId: getSLIs} }
security: [{ bearerAuth: [] }]
```

Ответы содержат `correlation_id`, `version`, `actor`.

## Моки и фикстуры

Структура:

```
mocks/
  api/*.json           # ответы эндпоинтов
  msw/handlers.ts      # для фронта (Mock Service Worker)
  postman/collection.json
```

Примеры:

- `mocks/api/task.get.json`: `{ "id":"...", "status":"running", "caps":{"usd":1.2,"tokens":20000} }`
- `mocks/api/gate.list.json`: `[{"id":"G123","pr":45,"checks":{"docs":"ok","tests":"ok"},"diff_stats":{"+":32,"-":4}}]`

## RBAC (UI и API)

Политика в `ops/ui-rbac.yml`:

```yaml
routes:
  '/': [viewer, operator, approver, admin, auditor]
  '/tasks/new': [operator, approver, admin]
  '/gates': [approver, admin]
  '/flags': [operator, approver, admin]
  '/ops/rollback': [approver, admin]
  '/audit': [auditor, admin]
actions:
  'task.pause': [operator, approver, admin]
  'gate.approve': [approver, admin]
  'prompt.ack': [operator, approver, admin]
  'rollback.exec': [approver, admin]
```

Фронт-guard:

```ts
if (!rbac.can(user.role, action)) deny()
```

API-мидлвар: проверка JWT `role`, `sub`, `aud`, `exp`; маппинг role→scope; deny по умолчанию.

## Аудит действий оператора

SQL:

```sql
CREATE TABLE audit.operator_action (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT now(),
  actor TEXT NOT NULL,         -- user/email
  role TEXT NOT NULL,
  action TEXT NOT NULL,        -- gate.approve, task.pause, flag.toggle, rollback.exec
  target TEXT,                 -- task:<id> | pr:<num> | flag:<name>
  reason TEXT,
  request_hash CHAR(64) NOT NULL,
  prev_hash CHAR(64),
  hash CHAR(64) NOT NULL
);
CREATE INDEX ON audit.operator_action (actor, ts);
```

Правила:

- Логировать до и после действия; хранить ссылку на payload в объектке; строить хеш-цепочку.
- В PR добавлять комментарий-след: кто и что сделал.
- В UI: вкладка Audit с фильтрами `actor`, `action`, `correlation_id`.

## UI-модули

- `Dashboard`, `TaskView`, `GateQueue`, `PromptGuardModal`, `FlagsPanel`, `RollbackModal`, `AuditLog`.
- Все мутации требуют `X-Correlation-Id` и подтверждения для risk-операций (двойной ввод).

## Критерии готовности UI

- MSW-моки покрывают все мутации.
- RBAC e2e-тесты: 403 на запрещённых действиях.
- В audit фиксируются 100% операторских операций.

---

# Каркас окружений и `quantapilot.yml` со схемой и валидацией.

## 1) Стек по умолчанию

- OS: macOS Sequoia 15.6
- Node: 22.x LTS
- PNPM: 9.x
- Python: 3.11.x (скрипты/CLI)
- Docker Desktop: 4.x, Compose v2
- Postgres: 15.x
- n8n: 1.x (self-hosted, через Docker)
- OpenAI SDK: `openai@4`
- Инструменты: `gh`, `age`, `sops`, `jq`, `yq`, `ajv-cli`

Установка (brew):

```bash
brew install node pnpm python@3.11 postgresql gh age sops jq yq
```

Файлы фиксации версий:

```
.tool-versions         # asdf (опционально)
.node-version          # 22.17.0
.pnpmfile.cjs          # lock полис
```

## 2) Локальные окружения

`.env.example`

```ini
OPENAI_API_KEY=...
GITHUB_APP_ID=...
GITHUB_INSTALLATION_ID=...
GITHUB_PRIVATE_KEY_BASE64=...
DATABASE_URL=postgres://user:pass@localhost:5432/quanta
TELEGRAM_BOT_TOKEN=...
N8N_URL=http://localhost:5678
```

`docker-compose.yml` (фрагмент)

```yaml
services:
  db:
    image: postgres:15
    environment:
      { POSTGRES_DB: quanta, POSTGRES_USER: user, POSTGRES_PASSWORD: pass }
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
volumes: { pgdata: {} }
```

## 3) Спецификация `quantapilot.yml`

Ключи и требования:

```yaml
version: v1 # обязателен
project:
  name: string # обязателен
  repo_url: string # git+https, обязателен
  default_branch: string # main|master
runtime:
  language: ts|py|go # обязателен
  node: '22.17.0' # если ts/js
  package_manager: pnpm|npm
  docker: true|false
  postgres: '15'
orchestrator:
  n8n_url: url # обязателен
  github_app: { installation_id: string } # обязателен
models: # обязателен
  plan: { model: string, temperature: 0..1, max_output_tokens: int }
  impl: { model: string, temperature: 0..1, max_output_tokens: int }
  test: { model: string, temperature: 0..1, max_output_tokens: int }
cost_caps:
  daily_usd: number # обязателен
  per_task_usd: number
pipeline:
  steps: # обязателен
    - name: plan
      timeout_s: int
      retries: int
      tokens_budget: int
    - name: impl
      timeout_s: int
      retries: int
      tokens_budget: int
    - name: test
      timeout_s: int
      retries: int
      tokens_budget: int
gates:
  docs_lint: true|false
  tests_required: true|false
rag:
  snapshot_id: string
  sources: [url, ...]
env_refs:
  openai_key: OPENAI_API_KEY # имена переменных окружения
  github_key: GITHUB_PRIVATE_KEY_BASE64
  db_url: DATABASE_URL
```

Пример `quantapilot.yml`

```yaml
version: v1
project:
  name: Acme CRM
  repo_url: https://github.com/acme/crm
  default_branch: main
runtime:
  language: ts
  node: '22.17.0'
  package_manager: pnpm
  docker: true
  postgres: '15'
orchestrator:
  n8n_url: http://localhost:5678
  github_app: { installation_id: '12345678' }
models:
  plan: { model: gpt-5-2025-07-15, temperature: 0, max_output_tokens: 800 }
  impl: { model: gpt-5-2025-07-15, temperature: 0.1, max_output_tokens: 2000 }
  test: { model: gpt-5-2025-07-15, temperature: 0, max_output_tokens: 1000 }
cost_caps:
  daily_usd: 20
  per_task_usd: 2
pipeline:
  steps:
    - { name: plan, timeout_s: 300, retries: 2, tokens_budget: 6000 }
    - { name: impl, timeout_s: 1500, retries: 2, tokens_budget: 20000 }
    - { name: test, timeout_s: 600, retries: 2, tokens_budget: 8000 }
gates:
  docs_lint: true
  tests_required: true
rag:
  snapshot_id: '2025-08-10'
  sources: ['https://docs.acme.com/api']
env_refs:
  openai_key: OPENAI_API_KEY
  github_key: GITHUB_PRIVATE_KEY_BASE64
  db_url: DATABASE_URL
```

## 4) JSON Schema для валидации

`_schemas/quantapilot.schema.json`

```json
{
  "$id": "qh.quantapilot.v1",
  "type": "object",
  "required": [
    "version",
    "project",
    "runtime",
    "orchestrator",
    "models",
    "cost_caps",
    "pipeline"
  ],
  "properties": {
    "version": { "const": "v1" },
    "project": {
      "type": "object",
      "required": ["name", "repo_url"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "repo_url": {
          "type": "string",
          "pattern": "^https://.+\\.git|^https://github\\.com/.+/.+"
        },
        "default_branch": { "type": "string" }
      }
    },
    "runtime": {
      "type": "object",
      "required": ["language"],
      "properties": {
        "language": { "enum": ["ts", "py", "go"] },
        "node": { "type": "string" },
        "package_manager": { "enum": ["pnpm", "npm"] },
        "docker": { "type": "boolean" },
        "postgres": { "type": "string", "pattern": "^1[0-9]$|^15$|^16$" }
      }
    },
    "orchestrator": {
      "type": "object",
      "required": ["n8n_url", "github_app"],
      "properties": {
        "n8n_url": { "type": "string", "format": "uri" },
        "github_app": {
          "type": "object",
          "required": ["installation_id"],
          "properties": { "installation_id": { "type": "string" } }
        }
      }
    },
    "models": {
      "type": "object",
      "required": ["plan", "impl", "test"],
      "properties": {
        "plan": { "$ref": "#/$defs/modelCfg" },
        "impl": { "$ref": "#/$defs/modelCfg" },
        "test": { "$ref": "#/$defs/modelCfg" }
      }
    },
    "cost_caps": {
      "type": "object",
      "required": ["daily_usd"],
      "properties": {
        "daily_usd": { "type": "number", "minimum": 0 },
        "per_task_usd": { "type": "number", "minimum": 0 }
      }
    },
    "pipeline": {
      "type": "object",
      "required": ["steps"],
      "properties": {
        "steps": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/stepCfg" }
        }
      }
    },
    "gates": {
      "type": "object",
      "properties": {
        "docs_lint": { "type": "boolean" },
        "tests_required": { "type": "boolean" }
      }
    },
    "rag": {
      "type": "object",
      "properties": {
        "snapshot_id": { "type": "string" },
        "sources": {
          "type": "array",
          "items": { "type": "string", "format": "uri" }
        }
      }
    },
    "env_refs": {
      "type": "object",
      "properties": {
        "openai_key": { "type": "string" },
        "github_key": { "type": "string" },
        "db_url": { "type": "string" }
      }
    }
  },
  "$defs": {
    "modelCfg": {
      "type": "object",
      "required": ["model", "temperature", "max_output_tokens"],
      "properties": {
        "model": { "type": "string" },
        "temperature": { "type": "number", "minimum": 0, "maximum": 1 },
        "max_output_tokens": { "type": "integer", "minimum": 1 }
      }
    },
    "stepCfg": {
      "type": "object",
      "required": ["name", "timeout_s", "retries", "tokens_budget"],
      "properties": {
        "name": { "enum": ["plan", "impl", "test", "doc", "pr"] },
        "timeout_s": { "type": "integer", "minimum": 1 },
        "retries": { "type": "integer", "minimum": 0 },
        "tokens_budget": { "type": "integer", "minimum": 1 }
      }
    }
  }
}
```

## 5) Валидация и CI

Скрипт:

```bash
pnpm add -D ajv-cli js-yaml
```

`scripts/validate-quantapilot.mjs`

```js
import fs from 'node:fs'
import yaml from 'js-yaml'
import { execSync } from 'node:child_process'
const obj = yaml.load(fs.readFileSync('quantapilot.yml', 'utf8'))
fs.writeFileSync('.tmp.qp.json', JSON.stringify(obj))
execSync(
  'npx ajv validate -s _schemas/quantapilot.schema.json -d .tmp.qp.json -c ajv-formats',
  { stdio: 'inherit' },
)
```

CI шаг:

```yaml
- name: Validate quantapilot.yml
  run: node scripts/validate-quantapilot.mjs
```

## 6) Префлайт на macOS

```bash
make setup   # docker up db, pnpm i, миграции
make check   # lint, schema-validate, docs:lint
```
