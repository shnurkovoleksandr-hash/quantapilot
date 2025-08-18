---
id: '30_milestones'
title: 'Milestones'
status: 'ready'
version: '0.1.0'
updated: '2025-08-18'
owners: ['shnurkovoleksandr-hash']
---

This document defines major milestones for implementing the QuantaPilot factory.  
Each milestone has clearly defined goals, acceptance criteria and artefacts. Milestones build on each other; a later milestone is not started until the previous one has been accepted.

## M‑001 — Bootstrap

**Goal.** Deliver the skeleton of the QuantaPilot factory and agree on its scope, roles, gates and outputs【876102779380499†L42-L49】.

**Criteria.**

- `ANCHOR.md` is filled out with Purpose, Inputs/Outputs, Scope, Non‑goals, Roles, Gates, ADR policy and Links【876102779380499†L80-L81】.
- All documentation files (`00_overview.md` … `99_glossary.md`) exist with front‑matter and headings【876102779380499†L45-L66】.
- Two ADRs are recorded: one selecting n8n as the orchestrator and another mandating PR‑only workflow【876102779380499†L82-L83】.
- Roles and responsibilities are agreed (Operator, Reviewer, System, Data Steward)【876102779380499†L19-L23】.
- Mandatory gates and decision format are defined【876102779380499†L31-L33】.

**Artefacts.**

- Repository skeleton with PNPM monorepo setup, package scaffolding and directory structure (docs, packages, apps, ops, contracts, prompts, tests, mocks).
- Documentation skeleton with populated front‑matter.
- ADRs for orchestrator choice and PR‑only policy.

## M‑002 — Orchestrator

**Goal.** Implement the core workflows in n8n and integrate the architecture agent.

**Criteria.**

- n8n runs are reproducible locally via Docker or a host installation.
- A trigger accepts `repo_url` and `branch` and clones the target repository.
- The PR/Architecture Agent reads the `README.md` and `quantapilot.yml` to generate documentation and writes it to a feature branch.
- Generated documents pass JSON‑Schema validation.
- Pull requests are opened for the documentation, and the anchor gate is invoked for operator approval.
- Logs and metrics (tokens, cost, duration) are recorded in PostgreSQL.

**Artefacts.**

- n8n flow definitions for cloning, documentation generation, validation, PR creation and gate handling.
- Implementation of the Architecture Agent contract and associated JSON schemas.
- Updated documentation on how to run the orchestrator.

## M‑003 — E2E

**Goal.** Deliver an end‑to‑end pipeline that executes at least one milestone on a pilot project.

**Criteria.**

- Milestones are parsed, and corresponding tasks are scheduled for Development and QA agents.
- Development Agent generates code and tests for the first milestone; QA Agent validates the output.
- The run pauses at the milestone gate; upon approval the feature branch is merged into the default branch.
- Operators can pause, retry or resume runs via CLI or n8n UI.
- Telegram notifications inform stakeholders of progress and gate decisions.
- A test project demonstrates the completion of one milestone from start to merge.

**Artefacts.**

- Development and QA agent contracts, schemas and example implementations.
- n8n flows for task scheduling, development, testing and gate management.
- End‑to‑end runbook demonstrating how to execute a pilot run.

---

Additional milestones (e.g. UI & RBAC, audit trails, rollback & cleanup, observability dashboards) are planned but outside the MVP scope. They can be added using the same structure.
