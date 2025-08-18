---
id: '99_glossary'
title: 'Glossary'
status: 'ready'
version: '0.1.0'
updated: '2025-08-19'
owners: ['shnurkovoleksandr-hash']
---

This glossary defines terms and abbreviations used throughout the QuantaPilot documentation.

## Terms

| Term                                   | Definition                                                                                                                                                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Agent**                           | A specialised service (often backed by a large language model) responsible for a distinct phase of development such as architecture analysis, code generation or quality assurance.                                                                         |
| **Anchor**                             | The entry‑point document summarising the factory’s purpose, inputs, outputs, roles, gates and ADR policy. Acceptance of the anchor is the first gate in a run.                                                                                              |
| **Architecture Decision Record (ADR)** | A short document capturing the context, decision and consequences of a significant architectural or process choice. ADRs are immutable and versioned.                                                                                                       |
| **Gate**                               | A checkpoint in the pipeline at which human approval is required. Gates can be mandatory (anchor acceptance, milestone M‑001, first merge) or optional (expensive prompts, model changes, CI policy changes, schema migrations)【876102779380499†L31-L33】. |
| **Human‑in‑the‑Loop (HITL)**           | A pattern where an automated system pauses to wait for human decisions before continuing【876102779380499†L29-L33】.                                                                                                                                        |
| **Milestone**                          | A logical phase of work with defined criteria (e.g. bootstrap, orchestrator, end‑to‑end). Milestones are defined in `30_milestones.md` and used to schedule tasks.                                                                                          |
| **Pipeline**                           | A run of the factory against a specific repository and branch. Pipelines are isolated and reproducible.                                                                                                                                                     |
| **Quantapilot.yml**                    | An optional configuration file in the target repository that overrides default stack settings, budgets and merge policies.                                                                                                                                  |
| **Repository**                         | A GitHub project that contains either the QuantaPilot factory (this repository) or a target project that will be processed by the factory.                                                                                                                  |
| **Run**                                | A single execution of the pipeline for a given repository and branch. Runs have statuses (queued, running, ok, error, canceled) and emit events.                                                                                                            |
| **Token Budget**                       | The maximum number of model tokens that may be consumed during a run. Exceeding the budget pauses the pipeline for operator input.                                                                                                                          |
| **n8n**                                | An open‑source workflow automation platform used as the orchestrator for QuantaPilot.                                                                                                                                                                       |

## Abbreviations

| Abbreviation | Expansion                         |
| ------------ | --------------------------------- |
| **ADR**      | Architectural Decision Record     |
| **API**      | Application Programming Interface |
| **CLI**      | Command‑Line Interface            |
| **CI**       | Continuous Integration            |
| **DB**       | Database                          |
| **HITL**     | Human‑in‑the‑Loop                 |
| **JWT**      | JSON Web Token                    |
| **MVP**      | Minimum Viable Product            |
| **NFR**      | Non‑Functional Requirement        |
| **PR**       | Pull Request                      |
| **SLA**      | Service Level Agreement           |
| **SLO**      | Service Level Objective           |
| **YAML**     | YAML Ain’t Markup Language        |

If you encounter unfamiliar terminology not defined here, please raise an issue so that it can be added to the glossary.
