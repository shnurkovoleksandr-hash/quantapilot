---
id: '60_constraints'
title: 'Constraints'
status: 'ready'
version: '0.1.0'
updated: '2025-08-18'
owners: ['shnurkovoleksandr-hash']
---

This document captures the technical, process and compliance constraints that govern the design of QuantaPilot.

## Technical

- **Supported versions:** The factory is developed and tested against Node 22, PNPM 9, Python 3.11 and PostgreSQL 15【832497655031489†L2-L32】.  
  Other versions may work but are not officially supported.
- **Operating systems:** Development is primarily on macOS and Linux. Windows is not currently supported.
- **Orchestrator:** n8n is used as the sole orchestrator. Alternative orchestrators (e.g. temporal) are out of scope for the MVP.
- **AI models:** Specific model versions (e.g. GPT‑5/mini, Cursor) and seeds are fixed to ensure reproducibility【876102779380499†L37-L40】. Changing a model requires an ADR and a gate.
- **Database:** PostgreSQL is the default database. Other databases may be supported via adapters but are not required in the MVP.
  The canonical connection variable is `DATABASE_URL`. Database schema changes use reversible migrations under `db/migrations/` (dbmate). Seed data and RLS policies live in `db/seeds/`.
- **Language:** English is the single project language for all artifacts.

## Process

- **Single‑project isolation:** Each run processes exactly one target project; pipelines do not share mutable state【876102779380499†L37-L40】.
- **Pull‑request only:** All changes to the target project and to the factory itself must go through pull requests; direct pushes are forbidden【876102779380499†L37-L39】.
- **Human‑in‑the‑Loop:** The pipeline pauses at mandatory gates (anchor acceptance, milestone M‑001, first merge) and optional gates for expensive prompts, model changes, CI policy changes and schema migrations【876102779380499†L31-L33】.
- **Declarative configuration:** All configuration is provided via files (e.g. `quantapilot.yml`). Hidden runtime configuration is not allowed【876102779380499†L37-L40】.
- **Version control:** The factory’s own repository must always build on a clean `main` branch. Branch protection rules require signed commits and passing CI statuses.

## Compliance

- **Privacy:** Do not store sensitive personal data in logs or artefacts. Use opaque identifiers for user references. Ensure compliance with GDPR or local regulations as applicable.
- **Secrets:** Secrets must be encrypted using `sops`/`age` with dual-secret rotation. Environment variables are encrypted in `.env.sops`, CI keys are managed via GitHub Secrets, and RBAC is implemented for n8n credentials. Rotation follows the schedule in `ops/security/secrets-rotation.md`.
- **Data retention:** Define retention periods for logs, metrics and artefacts. Automatically purge expired data via scheduled jobs (e.g. using `pg_cron`). In development environments where `pg_cron` is not available, retention jobs MUST be disabled or documented as optional.
- **Licensing:** Respect the licences of any open‑source tools or models integrated into the factory. The factory itself is released under the MIT licence (by default) and contributors must agree to contributor licence agreements as required.

These constraints are intentionally strict to ensure reproducibility, auditability and compliance. Any deviation requires an ADR and may introduce additional gates.
