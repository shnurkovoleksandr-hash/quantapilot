---
id: '90_api'
title: 'Integration API'
status: 'ready'
version: '0.1.0'
updated: '2025-08-19'
owners: ['shnurkovoleksandr-hash']
---

QuantaPilot exposes an integration API in the form of triggers and events. Triggers allow external systems to start runs; events allow external systems to react to state changes. This document describes the high‑level contract of these APIs. The detailed JSON schemas live under `_schemas/api.schema.json` and examples are provided in `_schemas/api.examples.json`.

## Triggers

Triggers start a new pipeline for a target project.

### HTTP webhook

- **Endpoint:** `/run` (path configurable when deploying n8n).
- **Method:** `POST`
- **Content‑Type:** `application/json`
- **Request body:**

  ```json
  {
    "repo_url": "https://github.com/org/project",
    "branch": "main",
    "quantapilot_yaml_path": "quantapilot.yml", // optional
    "correlation_id": "uuid-optional"
  }
  ```

  The `correlation_id` allows downstream tracking of events and logs.

- **Response:** `202 Accepted` with a run identifier (`run_id`).

### CLI trigger

Operators can also trigger runs via the CLI:

```bash
pnpm qp run --repo https://github.com/org/project --branch main [--correlation-id <uuid>]
```

The CLI wraps the webhook and adds interactive prompts for missing parameters.

## Events

During a run the system emits events. Events are published internally via n8n and externally via webhooks or message queues. Consumers can subscribe to events to integrate with dashboards or messaging platforms.

| Event                       | Payload schema                                 | Description                                                                     |
| --------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| **run_started**             | `{ run_id, repo_url, branch, correlation_id }` | A run has been accepted and the repository is being cloned.                     |
| **documentation_generated** | `{ run_id, docs_branch, pr_number }`           | Documentation has been generated and a pull request has been opened.            |
| **gate_requested**          | `{ run_id, gate, description }`                | The pipeline has paused at a gate (e.g. anchor, milestone) and awaits approval. |
| **gate_decision**           | `{ run_id, gate, approved, reason }`           | A gate has been approved or rejected.                                           |
| **milestone_completed**     | `{ run_id, milestone_id }`                     | A milestone has been completed successfully.                                    |
| **run_paused**              | `{ run_id, reason }`                           | The run has been paused manually or due to budget/time constraints.             |
| **run_resumed**             | `{ run_id }`                                   | A paused run has been resumed.                                                  |
| **run_failed**              | `{ run_id, error_code, message }`              | The run has terminated due to an unrecoverable error.                           |
| **run_completed**           | `{ run_id }`                                   | The run has completed successfully and all changes have been merged.            |

Fields such as `error_code` are defined in the common error schema under `_schemas/error.schema.json`.

## Security

- **Authentication:** Triggers and event subscriptions require an API token. n8n’s credentials framework stores tokens encrypted. Webhooks should include a secret header to verify the sender.
- **Rate limits:** The factory enforces rate limits on triggers and events to prevent abuse. Exceeding the limit returns a `429 Too Many Requests` response.
- **Permissions:** Only authorised operators may trigger runs. Consumers of events must be authenticated and authorised to receive information about a particular run or project.
- **Data protection:** Payloads avoid including sensitive data. Correlation IDs should not encode personal information.

For further details see the API JSON schema in [`_schemas/api.schema.json`](../_schemas/api.schema.json) and the integration examples in the `scripts/` directory.
