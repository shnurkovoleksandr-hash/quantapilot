# QuantaPilot Factory

Welcome to **QuantaPilot** — an autonomous software‑factory that turns a project specification into working code.

Фабрика разработки. Точка входа: [/docs/ANCHOR.md](./docs/ANCHOR.md).

## Quick Start

### Environment Setup

1. **Install Dependencies**:

   ```bash
   # Install SOPS and age for secret management
   brew install sops age  # macOS
   # or
   sudo apt install sops age  # Ubuntu
   ```

2. **Setup Environment**:

   ```bash
   ./scripts/setup-env.sh
   ```

3. **Enable direnv** (optional):

   ```bash
   direnv allow
   ```

4. **Setup Database** (optional):
   ```bash
   pnpm run db:setup
   ```

## Documentation

This repository contains comprehensive documentation for the QuantaPilot factory. The `docs/` folder is the living specification for how the factory operates. Each Markdown file is prefaced with a front‑matter block validated by the `_schemas/frontmatter.schema.json` schema.

### Where to start

If you are new to QuantaPilot, begin with [docs/ANCHOR.md](./docs/ANCHOR.md). It provides the contextual anchor for the entire factory: purpose, inputs, outputs, roles, gates and links to the rest of the documentation.

### Documentation Structure

| File                                                       | Purpose                                                |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| **[docs/00_overview.md](./docs/00_overview.md)**           | Extended overview of the factory and terminology.      |
| **[docs/10_architecture.md](./docs/10_architecture.md)**   | System context, major components and data flows.       |
| **[docs/20_requirements.md](./docs/20_requirements.md)**   | Functional and non‑functional requirements.            |
| **[docs/30_milestones.md](./docs/30_milestones.md)**       | Milestones and acceptance criteria for implementation. |
| **[docs/40_acceptance.md](./docs/40_acceptance.md)**       | Criteria for accepting documentation and workflows.    |
| **[docs/50_nonfunctional.md](./docs/50_nonfunctional.md)** | Reliability, security and observability targets.       |
| **[docs/60_constraints.md](./docs/60_constraints.md)**     | Technical, process and compliance constraints.         |
| **[docs/70_runbook.md](./docs/70_runbook.md)**             | Operational runbook and incident handling.             |
| **[docs/80_adrs.md](./docs/80_adrs.md)**                   | Architectural decision records (ADRs).                 |
| **[docs/90_api.md](./docs/90_api.md)**                     | External triggers, events and integration API.         |
| **[docs/99_glossary.md](./docs/99_glossary.md)**           | Glossary of terms and abbreviations.                   |

### Operations & Security

- **[Operations Overview](./ops/README.md)** - Operations documentation and procedures
- **[Data Catalog](./ops/data-catalog.md)** - Data classification and governance policies
- **[Security & Secrets](./ops/security/secrets-rotation.md)** - Secrets rotation policy
- **[Setup Guide](./ops/setup-guide.md)** - Complete setup and configuration guide
- **[Database Setup](./ops/db/README.md)** - Database configuration and management

### Additional Resources

- **JSON Schemas**: [`_schemas/`](./_schemas/) - Validation schemas for documentation and configuration
- **Examples**: [`examples/`](./examples/) - Example configurations and usage
- **Scripts**: [`scripts/`](./scripts/) - Automation and utility scripts
  - `pnpm run validate:api` - Validates API schemas for PII-free compliance

Each document cross‑links to relevant sections, enabling you to navigate the factory's specification without losing context.
