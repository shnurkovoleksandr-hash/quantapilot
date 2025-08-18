---
id: '40_acceptance'
title: 'Acceptance Criteria'
status: 'ready'
version: '0.1.0'
updated: '2025-08-18'
owners: ['shnurkovoleksandr-hash']
---

This document defines what “done” means for the factory itself.  
Acceptance is evaluated at three levels: documentation, orchestrator and quality gates. Each level must be met for a milestone to be closed.

## Documentation

- All mandatory documentation files (`ANCHOR.md`, `00_overview.md`, …, `99_glossary.md`) are present and filled out as per their section definitions【876102779380499†L45-L66】.
- Front‑matter metadata conforms to the JSON front‑matter schema (id, title, status, version, updated, owners) and passes `ajv` validation.
- Cross‑links between documents resolve correctly; there are no broken links.
- Two ADRs are recorded: one selecting n8n as the orchestrator and one mandating PR‑only workflow【876102779380499†L82-L83】.
- The anchor document is accepted by the reviewer through the anchor gate.【876102779380499†L31-L33】

## Orchestrator

- The n8n flows can be executed locally (e.g. via Docker) without runtime errors.
- A run can clone the target repository, generate documentation and open a documentation pull request.
- Documentation generation passes schema validation and the doc‑lint step.
- Runs record metrics (tokens, cost, duration) and logs in PostgreSQL.
- Notifications are delivered to Telegram at run start, gate requests and completion.
- The anchor gate, milestone M‑001 gate and first‑merge gate are implemented and block further progress until approved.【876102779380499†L31-L33】

## Quality Gates

Quality gates are the decision points at which human review is mandatory. For each gate:

- The system presents a clear description of what is being approved (e.g. “Accept anchor”, “Accept M‑001 deliverables”).
- The reviewer can approve or reject with a reason. Rejections stop the run; approvals allow the run to continue.
- Decisions are recorded in an ADR or gate log for traceability.
- Pull requests include automated checks (e.g. linting, unit tests) and must pass those checks before they can be merged.
- Token and cost budgets have not been exceeded; if they have, the run is paused awaiting operator input.

A milestone is considered accepted when all documentation, orchestrator and quality‑gate criteria have been met and the reviewer has signalled approval.
