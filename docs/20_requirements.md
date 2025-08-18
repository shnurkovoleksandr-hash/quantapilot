---
id: '20_requirements'
title: 'Requirements'
status: 'ready'
version: '0.1.0'
updated: '2025-08-18'
owners: ['shnurkovoleksandr-hash']
---

## Functional requirements

QuantaPilot must:

1. **Ingest project specifications.** Read the target repository’s `README.md` and optional `quantapilot.yml` as inputs【876102779380499†L10-L15】.
2. **Generate documentation.** Produce the full documentation suite (`ANCHOR.md`, `00_overview.md`, …, `99_glossary.md`) and accompanying JSON schemas in the target repository【876102779380499†L50-L66】.
3. **Validate outputs.** Run JSON‑Schema validation (using `ajv`) against the generated documents. Fail fast on validation errors.
4. **Plan and execute milestones.** Parse the milestones document and create tasks for each milestone. Hand tasks to the Development and QA agents for implementation and testing.
5. **Orchestrate workflows.** Use n8n to coordinate cloning, agent calls, validation, retries, gating and merging.
6. **Provide human‑in‑the‑loop gates.** Pause at mandatory gates (anchor acceptance, milestone M‑001, first merge) and optional gates (expensive prompts, model changes, CI policy changes, schema migrations)【876102779380499†L31-L33】.
7. **Integrate with GitHub.** Use a GitHub App to clone repositories, open pull requests, set commit statuses and fetch repository metadata.【876102779380499†L10-L15】
8. **Notify via Telegram.** Send notifications to operators and reviewers about state changes, requests for approval and errors【876102779380499†L10-L15】.
9. **Track metrics.** Record run metadata (tokens consumed, cost, duration, retry counts), artefacts and logs in PostgreSQL.
10. **Expose a CLI and API.** Provide a command‑line interface for triggering runs and a webhook for external triggers. Define an events API for integration with other services (see [`90_api.md`](90_api.md)).

## Non‑functional requirements (development/test scope)

During the development and testing of QuantaPilot the following non‑functional requirements apply. Production NFRs for target applications are deliberately out of scope【876102779380499†L24-L28】.

- **Reliability:** The orchestrator must handle transient failures via retries with exponential backoff. Steps should be idempotent where possible. Runs must be resumable after a crash.
- **Performance:** Documentation generation for a typical project should complete within minutes. Agents should respect per‑step timeouts and token budgets.
- **Scalability:** The system should support multiple concurrent runs, each isolated from others【876102779380499†L37-L40】.
- **Security & Privacy:** Use minimal GitHub permissions and store secrets encrypted with `sops`/`age`. Do not persist personal data beyond what is needed for audit. Follow the data policies described in [`60_constraints.md`](60_constraints.md).
- **Observability:** Emit structured logs, metrics and traces to PostgreSQL and optionally to other monitoring back‑ends. Provide dashboards or queries to inspect runs and budgets.
- **Maintainability:** Structure the codebase as a PNPM monorepo with clear package boundaries (core, diagnostics, CLI). Use TypeScript with strict settings and enforce linting and formatting.
- **Extensibility:** Support adding new agent types or workflows without breaking existing contracts. Version agent contracts and schemas following semantic versioning.

## Assumptions

The requirements above assume:

- **Environment readiness.** The host system has Node 22, PNPM 9, Python 3.11, Docker, `gh`, `sops`/`age`, `jq` and `yq` installed【832497655031489†L2-L32】.
- **Project specification.** Each target repository provides a comprehensive `README.md` describing what to build and may provide a `quantapilot.yml` for custom settings【876102779380499†L10-L15】.
- **Roles exist.** Operators and reviewers are available to start runs, approve gates and provide feedback【876102779380499†L19-L23】.
- **Budget awareness.** A daily token budget is defined; the factory must operate within this budget and fail gracefully when exceeded.
- **Isolated pipelines.** Each project is processed in its own pipeline; there is no shared mutable state between runs【876102779380499†L37-L40】.
- **Model stability.** AI model versions and seeds are fixed for reproducibility【876102779380499†L37-L40】.
