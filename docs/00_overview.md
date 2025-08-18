---
id: '00_overview'
title: 'Overview'
status: 'ready'
version: '0.1.0'
updated: '2025-08-19'
owners: ['shnurkovoleksandr-hash']
---

## Summary

**QuantaPilot** is an automated development environment built around the idea of a **software factory**.  
It ingests a project's specification, orchestrates specialised agents to generate documentation, source code, tests and infrastructure, and returns those artefacts as pull requests for human approval.  
The factory operates autonomously but pauses at human‑defined gates; all work is logged and reproducible.  
Generated artefacts live in the target repository; the factory’s own repository holds the orchestrator, agent contracts and documentation【876102779380499†L2-L8】.

## Terminology

This documentation uses a number of terms of art. See [`99_glossary.md`](99_glossary.md) for comprehensive definitions.  
Key concepts include:

| Term                                    | Description                                                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HITL (Human‑in‑the‑Loop)**            | A process in which an automated pipeline pauses for human approval before proceeding【876102779380499†L29-L33】.                                                             |
| **Gate**                                | A checkpoint where the operator or reviewer must approve or reject work【876102779380499†L31-L33】.                                                                          |
| **Agent**                               | A specialised AI service responsible for a particular phase of development (architecture, development, quality assurance).                                                   |
| **ADR (Architectural Decision Record)** | A document capturing a significant architectural or process decision (context, decision, consequences).                                                                      |
| **Milestone**                           | A logical phase of work with defined criteria; milestones are defined in [`30_milestones.md`](30_milestones.md).                                                             |
| **SLO/SLA**                             | Service Level Objective / Agreement; used to set reliability targets. QuantaPilot focuses on development SLOs and does not provide end‑user SLAs【876102779380499†L24-L28】. |

## Context

QuantaPilot acts as an intermediary between a **target project** and a network of **AI agents**.  
When the operator triggers a run, QuantaPilot clones the target repository, reads its `README.md` and optional `quantapilot.yml`, and invokes the architecture agent to produce a comprehensive documentation suite.  
Validation scripts ensure that the generated documents conform to their JSON schemas.  
Subsequent milestones hand work to development and QA agents, culminating in pull requests that are reviewed at gates.

Externally, QuantaPilot integrates with:

- **GitHub** – via a GitHub App that reads and writes repositories, opens PRs and reports statuses.
- **Telegram** – for notifications and interactions with operators.
- **PostgreSQL** – to store run history, metrics, budgets and logs. The canonical connection variable is `DATABASE_URL`; migrations are managed with `dbmate`.
- **OpenAI (or other AI providers)** – to supply the models behind each agent. Model versions and seeds are fixed for reproducibility【876102779380499†L37-L40】.
- **SOPS/age** – for secure secrets management with encryption and dual-secret rotation.

Internally, the factory is implemented as a PNPM monorepo with packages for the core contracts, diagnostics and CLI. The orchestrator is composed of n8n flows (see [`10_architecture.md`](10_architecture.md)) that call out to agents and manage retries and budgets.

Each target project is processed in an isolated pipeline; no state is shared across runs. Configuration is declarative, via files such as `quantapilot.yml`; there are no hidden settings【876102779380499†L37-L40】.  
All code changes are delivered through pull requests; direct pushes are forbidden【876102779380499†L37-L39】.
