---
id: 'anchor'
title: 'ANCHOR – Factory Context'
status: 'ready'
version: '0.1.0'
updated: '2025-08-18'
owners: ['shnurkovoleksandr-hash']
---

## Purpose

QuantaPilot is a self‑hosted development factory.  
Its mission is to read a target project’s specification (the project’s `README.md` and optional `quantapilot.yml`), orchestrate a network of AI agents to generate documentation, code, tests and infrastructure, and return those artefacts as pull requests for human review.  
The factory operates autonomously but pauses at defined **Human‑in‑the‑Loop (HITL)** gates for operator approval【876102779380499†L29-L33】.  
All generated artefacts live in the target project; the factory’s own repository contains only its orchestrator, agent contracts and documentation【876102779380499†L2-L8】.

QuantaPilot is **not** responsible for hosting the finished product or providing production‑grade security operations and SLAs for end users; those concerns remain out of scope【876102779380499†L24-L28】.

## Inputs

- **`repo_url`** – URL of the target repository.
- **`branch`** – branch to work on (typically the default branch).
- **Project `README.md`** – serves as the primary specification【876102779380499†L10-L15】.
- **`quantapilot.yml`** _(optional)_ – overrides stack, budgets and merge policies【876102779380499†L10-L15】.
- **GitHub App installation** – provides the minimal permissions needed to open PRs, write statuses and read repository contents【876102779380499†L10-L15】.
- **Telegram channel** – used for notifications to operators and reviewers【876102779380499†L10-L15】.
- **Token budget** – daily token limit and budgets per task.

## Outputs

For the **target project**:

- Documentation files (`ANCHOR.md`, `00_overview.md`, …, `99_glossary.md`) and JSON schemas【876102779380499†L50-L66】.
- Pull requests containing generated code, tests, CI configuration and changelogs【876102779380499†L5-L9】.

For **QuantaPilot** itself:

- Logs and replay artefacts (`app.run.diagnostics`).
- n8n artefacts such as run histories and gate statuses【876102779380499†L5-L9】.
- Architectural decision records in `docs/80_adrs.md`.
- Validation schemas and linting scripts.

## Scope

**Included:** analysis of requirements, generation of project documentation, code and tests; setup of basic CI; GitHub/Telegram integrations; minimal database schema and migrations; end‑to‑end execution of the pipeline【876102779380499†L24-L28】.

**Excluded:** hosting the finished application, full security operations of the target infrastructure, detailed non‑functional requirements for production (see non‑functional requirements), and any end‑user SLAs【876102779380499†L24-L28】.

## Roles

- **Operator** – triggers pipelines, manages pauses/retries, approves or rejects gates【876102779380499†L19-L21】.
- **Reviewer / Gatekeeper** – reviews pull requests and documentation changes; records approve or reject decisions with reasons【876102779380499†L19-L21】.
- **System** – the combination of n8n and the AI agents performing the Dev→QA→Gate steps and keeping audit logs【876102779380499†L19-L22】.
- **Data Steward** – optional role responsible for verifying personal data handling and compliance【876102779380499†L22-L23】.

## Gates

Mandatory gates include acceptance of the initial anchor document (`ANCHOR.md`), acceptance of milestone **M‑001** (`30_milestones.md`) and the first merge of generated code into the default branch【876102779380499†L31-L33】.  
Optional gates may be inserted for expensive prompts, model changes, CI policy adjustments or database schema migrations【876102779380499†L31-L33】.

At each gate the operator or reviewer explicitly approves or rejects the work. Decisions are captured as ADRs.

## Language

All documentation, configs, and code comments are written in English only.

## ADR policy

Significant architectural or process decisions are recorded in [`docs/80_adrs.md`](80_adrs.md).  
Each ADR follows the format **Context → Decision → Consequences** and is versioned for traceability.  
If a decision affects a target project rather than the factory itself, an ADR should also be added to that project’s documentation.

## Links

- [00_overview.md](00_overview.md) – extended overview and terminology.
- [10_architecture.md](10_architecture.md) – system context, components and data flows.
- [20_requirements.md](20_requirements.md) – functional and non‑functional requirements.
- [30_milestones.md](30_milestones.md) – implementation milestones.
- [40_acceptance.md](40_acceptance.md) – acceptance criteria for the factory.
- [50_nonfunctional.md](50_nonfunctional.md) – reliability, security and observability targets.
- [60_constraints.md](60_constraints.md) – technical, process and compliance constraints.
- [70_runbook.md](70_runbook.md) – operational runbook.
- [80_adrs.md](80_adrs.md) – architectural decision log.
- [90_api.md](90_api.md) – integration API and events.
- [99_glossary.md](99_glossary.md) – glossary of terms.

Refer to the index in the main [README.md](../README.md) for a tabular overview.
