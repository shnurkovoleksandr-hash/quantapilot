№4. Документация: скелет файлов — детально

1. Структура каталогов

```bash
mkdir -p docs _schemas
```

2. Индекс документации

```bash
cat > docs/README.md <<'MD'
# QuantaPilot — Документация
См. ANCHOR.md как точку входа. Остальные файлы: 00_overview.md, 10_architecture.md, 20_requirements.md, 30_milestones.md, 40_acceptance.md, 50_nonfunctional.md, 60_constraints.md, 70_runbook.md, 80_adrs.md, 90_api.md, 99_glossary.md.
MD
```

3. ANCHOR.md (якорь фабрики)

```bash
cat > docs/ANCHOR.md <<'MD'
---
id: "anchor"
title: "ANCHOR — контекст фабрики"
status: "draft"
version: "0.1.0"
updated: "2025-08-18"
owners: ["@owner"]
---

## Purpose
Краткая цель, режим HITL, границы.

## Inputs / Outputs
Входы: repo_url, branch, README целевого проекта, quantapilot.yml (опц.).
Выходы: PRы, docs, логи, реплеи.

## Roles
Operator, Reviewer/Gatekeeper, System, Data Steward.

## Gates
Обязательные и необязательные гейты.

## ADR Policy
Как фиксируем решения в 80_adrs.md.

## Links
Ссылки на остальные документы и схемы.
MD
```

4. Шаблон для всех docs/\* (минимальные разделы)

```bash
TODAY="2025-08-18"

cat > docs/00_overview.md <<MD
---
id: "00_overview"
title: "Обзор"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Summary
Краткий обзор фабрики.

## Terminology
Термины и определения.

## Context
Границы и взаимодействия высокого уровня.
MD

cat > docs/10_architecture.md <<MD
---
id: "10_architecture"
title: "Архитектура"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## System Context
Контекстная диаграмма и границы.

## Components
Составные части (n8n, агенты, CLI).

## Data Flows
Основные потоки и события.

## Constraints
Ключевые архитектурные ограничения (ссылки на 60_constraints.md).
MD

cat > docs/20_requirements.md <<MD
---
id: "20_requirements"
title: "Требования"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Functional
Список функций фабрики.

## Non-Functional (dev/test scope)
Ссылки на 50_nonfunctional.md.

## Assumptions
Предпосылки и допущения.
MD

cat > docs/30_milestones.md <<MD
---
id: "30_milestones"
title: "Milestones"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## M-001 — Bootstrap
Критерии готовности и артефакты.

## M-002 — Orchestrator
Критерии.

## M-003 — E2E
Критерии.
MD

cat > docs/40_acceptance.md <<MD
---
id: "40_acceptance"
title: "Acceptance Criteria"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Documentation
Что считается принятой документацией.

## Orchestrator
Критерии приёмки n8n-потоков.

## Quality Gates
Блокирующие статусы и правила.
MD

cat > docs/50_nonfunctional.md <<MD
---
id: "50_nonfunctional"
title: "Нефункциональные требования"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Reliability / SLO
Цели и бюджеты ошибок.

## Security / Privacy
Минимальные политики.

## Observability
Логи, метрики, трассировка.
MD

cat > docs/60_constraints.md <<MD
---
id: "60_constraints"
title: "Ограничения"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Technical
Версии, платформы, совместимость.

## Process
Только PR, HITL-гейты.

## Compliance
PII и хранение данных.
MD

cat > docs/70_runbook.md <<MD
---
id: "70_runbook"
title: "Runbook"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Onboarding
Как запустить фабрику.

## Operations
Пауза/ретрай/продолжить, где смотреть статусы.

## Incident Response
Частые инциденты и восстановление.
MD

cat > docs/80_adrs.md <<MD
---
id: "80_adrs"
title: "Architectural Decisions"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## ADR-0001: n8n как оркестратор
Context, Decision, Consequences.

## ADR-0002: Политика PR-only
Context, Decision, Consequences.
MD

cat > docs/90_api.md <<MD
---
id: "90_api"
title: "Интеграции и API"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Triggers
Вебхуки и CLI.

## Events
События и полезная нагрузка.

## Security
Аутентификация и rate limits.
MD

cat > docs/99_glossary.md <<MD
---
id: "99_glossary"
title: "Глоссарий"
status: "draft"
version: "0.1.0"
updated: "${TODAY}"
owners: ["@owner"]
---

## Terms
HITL, Gate, ADR, SLO и др.

## Abbreviations
Список сокращений.
MD
```

5. Корневой README обновить, чтобы указывать на docs

```bash
cat > README.md <<'MD'
# QuantaPilot Factory
Фабрика разработки. Точка входа: [/docs/ANCHOR.md](./docs/ANCHOR.md).
MD
```

6. Заготовки схем (минимально валидные; наполнение в п.6 гайда)

```bash
cat > _schemas/frontmatter.schema.json <<'JSON'
{ "$schema":"https://json-schema.org/draft/2020-12/schema",
  "$id":"https://schemas.quantapilot/frontmatter.schema.json",
  "type":"object",
  "properties":{
    "id":{"type":"string"},
    "title":{"type":"string"},
    "status":{"enum":["draft","ready","deprecated"]},
    "version":{"type":"string"},
    "updated":{"type":"string","format":"date"},
    "owners":{"type":"array","items":{"type":"string"}}
  },
  "required":["id","title","status","version","updated","owners"],
  "additionalProperties":true
}
JSON

cat > _schemas/milestone.schema.json <<'JSON'
{ "$schema":"https://json-schema.org/draft/2020-12/schema",
  "$id":"https://schemas.quantapilot/milestone.schema.json",
  "type":"object",
  "properties":{
    "id":{"type":"string"},
    "title":{"type":"string"},
    "criteria":{"type":"array","items":{"type":"string"}}
  },
  "required":["id","title"],
  "additionalProperties":true
}
JSON

cat > _schemas/quantapilot.schema.json <<'JSON'
{ "$schema":"https://json-schema.org/draft/2020-12/schema",
  "$id":"https://schemas.quantapilot/quantapilot.schema.json",
  "type":"object",
  "properties":{
    "stack":{"type":"object"},
    "limits":{"type":"object"},
    "policies":{"type":"object"}
  },
  "additionalProperties":true
}
JSON

cat > _schemas/api.schema.json <<'JSON'
{ "$schema":"https://json-schema.org/draft/2020-12/schema",
  "$id":"https://schemas.quantapilot/api.schema.json",
  "type":"object",
  "properties":{
    "triggers":{"type":"array","items":{"type":"string"}},
    "events":{"type":"array","items":{"type":"string"}}
  },
  "additionalProperties":true
}
JSON
```

7. Коммит

```bash
git add docs _schemas README.md
git commit -m "docs: scaffold factory docs and schema stubs"
git push
```

8. Выходы шага

- Созданы все файлы документации и индекс.
- Схемы-заготовки валидны JSON.
- Корневой README указывает на `docs/ANCHOR.md`.

9. Acceptance для шага №4

- Все перечисленные файлы присутствуют.
- Парсинг фронтматтера VS Code’ом не падает.
- Схемы открываются без ошибок парсинга.
