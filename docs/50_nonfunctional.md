---
id: '50_nonfunctional'
title: 'Non‑functional Requirements'
status: 'ready'
version: '0.1.0'
updated: '2025-08-19'
owners: ['shnurkovoleksandr-hash']
---

This document describes the non‑functional requirements (NFRs) of the QuantaPilot factory in the development and test scope. NFRs for the deployed target applications are out of scope【876102779380499†L24-L28】.

## Reliability / SLO

- **Error budgets:** For each run, a maximum number of retry attempts and token budget is defined. Exceeding budgets pauses the run and triggers operator intervention.
- **Retry policy:** Steps retry transient errors using exponential backoff with jitter. Retriable errors include rate limits, upstream timeouts, transient network failures and tool failures. Validation errors, precondition failures, budget exhaustion and fatal errors fail fast.
- **Timeouts:** Each agent call specifies a timeout (e.g. 180 s for code generation). Orchestrator steps have global timeouts and can be resumed.
- **Run statuses:** Runs progress through statuses (`queued`, `running`, `ok`, `error`, `canceled`). Runs can be paused and resumed without loss of state.
- **Service Level Objectives:** The factory aims to complete documentation generation within minutes and a full milestone within hours. These objectives inform timeouts and budgets.

## Security / Privacy

- **Minimal privileges:** The GitHub App uses only the scopes necessary to read/write contents, create pull requests and update commit statuses【876102779380499†L10-L15】.
- **Secret management:** Secrets (API keys, encryption keys, database credentials) are stored encrypted with `sops`/`age` and decrypted at runtime. Public age keys are generated as part of environment setup【832497655031489†L84-L90】.
- **Data policies:** Personally identifiable information is not stored in logs. Database rows reference users via opaque identifiers. Row‑level security and role‑based access control protect data. Retention policies purge run logs and metrics after a configurable period.
- **Compliance:** The factory follows the GitHub terms of service, OpenAI usage policies and applicable data‑protection laws. Operators must ensure that project data and budgets comply with organisational policies.

## Observability

- **Logging:** Each step emits structured logs containing timestamps, run IDs, step names, durations, tokens and cost. Logs are stored in PostgreSQL and optionally forwarded to external log aggregators.
- **Metrics:** Metrics include tokens consumed, cost (USD), step duration, success/failure counts and retry counts. Metrics drive SLO calculations.
- **Tracing:** A correlation ID flows through all steps, allowing end‑to‑end tracing of a run.
- **Dashboards:** n8n’s built‑in UI and/or custom dashboards expose the state of active runs, pending gates, budgets and historical runs.
- **Alerting:** Notifications via Telegram inform operators of state changes, gate requests and failures. Future integrations can extend notifications to other channels.
