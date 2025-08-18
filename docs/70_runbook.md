---
id: '70_runbook'
title: 'Runbook'
status: 'ready'
version: '0.1.0'
updated: '2025-08-19'
owners: ['shnurkovoleksandr-hash']
---

This runbook provides practical guidance for operators and maintainers of QuantaPilot. It covers onboarding a new project, routine operations and responding to incidents.

## Onboarding

1. **Set up your environment.** Ensure Node 22, PNPM 9, Python 3.11, Docker, `gh`, `sops`/`age`, `jq` and `yq` are installed and configured【832497655031489†L2-L32】. Generate an age key and configure `direnv` as described in the environment guide【832497655031489†L84-L106】.
2. **Create a target repository.** Create a new GitHub repository for your application. Populate its `README.md` with a clear description of the desired system (this becomes the specification). Optionally add a `quantapilot.yml` file to override stack, budgets and merge policies【876102779380499†L10-L15】.
3. **Install integrations.** Install the QuantaPilot GitHub App into the organisation and grant it access to the target repository. Create a Telegram channel and configure the factory’s bot to post notifications【876102779380499†L10-L15】.
4. **Start n8n.** Run n8n either locally (e.g. `docker run n8nio/n8n`) or via a docker‑compose stack. Ensure n8n has access to PostgreSQL and secrets.
5. **Trigger a run.** Use the CLI (`pnpm qp run --repo <repo_url> --branch <branch>`) or an n8n webhook to start a pipeline. Provide any required authentication tokens.
6. **Approve the anchor.** When the anchor gate triggers, review the generated `ANCHOR.md` and either approve or reject. An approval continues the pipeline to generate the full documentation suite; a rejection stops the run and records the reason.
7. **Iterate.** Monitor the run via n8n’s UI or CLI. Approve or reject milestone gates. Review PRs for documentation and code. Provide feedback via ADRs.

## Operations

- **Pause/Resume.** Operators can pause a run at any time (e.g. before an expensive agent call). Pausing serialises the run state to PostgreSQL. Resuming restores the state and continues execution.
- **Retry.** If a step fails with a retriable error (rate limit, network error, upstream timeout), the orchestrator retries automatically. Operators can manually trigger an additional retry or abort the run.
- **Inspect status.** Use the CLI (`pnpm qp status <run_id>`) or the n8n UI to inspect current status, pending gates, token consumption, cost and logs. Run IDs and correlation IDs are displayed in notifications.
- **Adjust budgets.** If a run pauses due to token budget exhaustion, operators can increase the budget in `quantapilot.yml` and resume the run. Budget increases are recorded in the run history.
- **Handle validation errors.** If the doc‑lint step fails, review the error messages, adjust the `README.md` or agent prompts, and restart the run. Validation failures do not attempt retries.
- **Secrets management.** Use `./scripts/setup-env.sh` for initial environment setup. For CI/CD, run `./scripts/setup-ci-keys.sh` to generate keys and follow the setup guide in `ops/setup-guide.md`. Rotate secrets according to the schedule in `ops/security/secrets-rotation.md`.

## Database operations

The factory uses PostgreSQL 15. The canonical environment variable for connections is `DATABASE_URL`.

- Start database: `docker compose up -d db`
- Apply migrations: `pnpm run db:up`
- Seed data: `pnpm run db:seed`
- Lint SQL: `pnpm run db:lint`

Notes:

- Local default: `postgres://qp:qp@localhost:5432/quantapilot?sslmode=disable`
- Init scripts enable `pgcrypto` and conditionally `pg_cron` if available. In development, retention/rollup jobs are skipped if `pg_cron` is not present.
- See `ops/db/README.md` for details.

## Incident Response

Common incidents and remediation steps:

- **Merge conflict in documentation PR.** Resolve the conflict in the target repository and rebase the feature branch. Resume the run from the paused state.
- **Timeout or model error.** The orchestrator retries transient errors automatically. Persistent failures may require adjusting timeouts or budgets, or updating the model version via an ADR and gate.
- **Database unavailable.** If PostgreSQL is unreachable, n8n will fail to record run state. Restore the database from backups and restart n8n. Ensure `pg_cron` jobs are running to clean up old logs.
- **n8n crash.** Restart n8n. Because run state is stored externally, crashed runs can be resumed. Investigate logs in `packages/diagnostics` for root cause.
- **Budget exceeded.** When token or cost budgets are exceeded, the run pauses. Operators can increase budgets or cancel the run. Budget changes should be recorded in an ADR.
- **Secrets compromised.** Rotate compromised secrets immediately using the dual-secret rotation process documented in `ops/security/secrets-rotation.md`. Update the encrypted secrets file using `sops` and re‑deploy. Review access logs and revoke affected tokens.

For any incident not covered here, consult the project’s ADRs and open an issue. The ADR log serves as the canonical record of past decisions and rationales.
