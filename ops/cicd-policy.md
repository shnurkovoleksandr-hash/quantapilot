# CICD Policy

## Protected Paths

The following paths are protected and require special approval for changes:

### Infrastructure & Operations
- `.github/workflows/` - CI/CD workflows
- `ops/` - Operations configuration and scripts
- `contracts/` - Service contracts and interfaces
- `db/migrations/` - Database schema changes
- `infra/` - Infrastructure as code
- `Dockerfile` - Container definitions
- `docker/` - Docker-related files

### Package Management
- `package.json` - Dependencies and scripts
- `package-lock.json` - Locked dependency versions

## Change Control

### Workflow Changes
Any PR touching `.github/workflows/**` requires:
- Label: `ops:workflow-change`
- Minimum 2 reviews from `@ops-leads`
- No auto-merge allowed
- Manual approval through GitHub Environment `ci-admin`

### Infrastructure Changes
Changes to `ops/*`, `contracts/*`, `db/migrations/*` trigger:
- Separate `change-control.yml` pipeline
- Policy diff publication
- ACK checklist (SLO/cost/security/rollback)
- Failure without completed checklist

### Bot Restrictions
The `quantapilot-bot` cannot modify:
- Any protected paths listed above
- Workflow files without proper labels
- Infrastructure files without human approval

## Auto-PR Rules

Bot-generated PRs are marked with:
- `source:agent/<name>`
- `type:docgen|feature_xs|feature_s`

Auto-merge allowed only if:
- Files changed are in `agent_write_allowlist`
- All required status checks pass
- No conflicts or protected paths affected

## Status Checks

Required status checks for main branch:
- `policy/enforcer`
- `docs-lint`
- `quality-gate`
- `security-scan`
