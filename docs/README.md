# QuantaPilot Documentation

Welcome to the documentation for **QuantaPilot** — an autonomous software‑factory that turns a project specification into working code.  
This folder is the living specification for how the factory operates.  
Each Markdown file is prefaced with a front‑matter block validated by the `_schemas/frontmatter.schema.json` schema.  

## Where to start

If you are new to QuantaPilot, begin with [ANCHOR.md](ANCHOR.md).  
It provides the contextual anchor for the entire factory: purpose, inputs, outputs, roles, gates and links to the rest of the documentation.

## File index

| File | Purpose |
| --- | --- |
| **00_overview.md** | Extended overview of the factory and terminology. |
| **10_architecture.md** | System context, major components and data flows. |
| **20_requirements.md** | Functional and non‑functional requirements. |
| **30_milestones.md** | Milestones and acceptance criteria for implementation. |
| **40_acceptance.md** | Criteria for accepting documentation and workflows. |
| **50_nonfunctional.md** | Reliability, security and observability targets. |
| **60_constraints.md** | Technical, process and compliance constraints. |
| **70_runbook.md** | Operational runbook and incident handling. |
| **80_adrs.md** | Architectural decision records (ADRs). |
| **90_api.md** | External triggers, events and integration API. |
| **99_glossary.md** | Glossary of terms and abbreviations. |

Additional JSON schemas live in the [`_schemas/`](../_schemas/) directory.

Each document cross‑links to relevant sections, enabling you to navigate the factory’s specification without losing context.