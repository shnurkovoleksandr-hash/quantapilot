---
id: '80_adrs'
title: 'Architectural Decisions'
status: 'ready'
version: '0.1.0'
updated: '2025-08-18'
owners: ['shnurkovoleksandr-hash']
---

This document records significant architectural and process decisions made during the development of QuantaPilot. Each entry follows the format **Context → Decision → Consequences**. ADRs are immutable historical records; when a decision is superseded, a new ADR should be created rather than editing an existing one.

## ADR‑0001: n8n as orchestrator

**Context.** We need an orchestrator to coordinate cloning repositories, calling AI agents, handling retries, pausing at gates and resuming runs. Candidate orchestrators included bespoke scripts, temporal.io, Airflow and n8n.

**Decision.** We chose **n8n** because it is open‑source, self‑hosted and provides a graphical editor for workflows that can be stored and versioned. n8n supports webhooks, cron triggers, retry logic, credential management and a rich ecosystem of pre‑built nodes. Its low‑code nature lowers the barrier for non‑developers to modify flows.

**Consequences.**

- Workflows are defined as n8n nodes and stored in version control. Custom functionality is encapsulated in JavaScript/TypeScript functions.
- n8n must be deployed and secured as part of the factory environment. Operators need to monitor its health.
- Concurrency and scaling are limited by n8n’s single‑instance architecture. Future ADRs may introduce horizontal scaling if required.
- Switching to another orchestrator later would require re‑implementing flows and integrations.

## ADR‑0002: Pull‑request only policy

**Context.** The factory must update target repositories and its own repository. Direct pushes risk losing auditability, bypassing review and reducing traceability【876102779380499†L37-L39】.

**Decision.** All changes – whether to a target project or the factory itself – **must be delivered via pull requests**. Direct pushes to protected branches are forbidden. Pull requests trigger review workflows and enable the human‑in‑the‑loop gates.

**Consequences.**

- Every change is reviewable. Reviewers can approve or request changes, and their decisions are recorded.
- Automated CI checks (linting, tests, doc‑lint) run on pull requests before merge.
- Feature development may take longer due to the overhead of PRs and reviews.
- Scripts and agents must be able to create branches and open pull requests with appropriate credentials.

---

Further ADRs will document decisions such as retry strategies, database schema design, error taxonomy and UI choices. Each should be added as a new section with an incrementing identifier.
