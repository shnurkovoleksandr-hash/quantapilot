# Database Setup for QuantaPilot

This directory contains the database configuration and initialization scripts for the QuantaPilot project.

## Quick Start

```bash
# Set up database (starts PostgreSQL, runs migrations, seeds data)
pnpm run db:setup

# Or run steps individually:
pnpm run db:up     # Run migrations
pnpm run db:seed   # Seed database
```

## Architecture

The database is organized into three schemas:

- **`app`** - Application data (projects, milestones, etc.)
- **`pii`** - Personally Identifiable Information with Row Level Security
- **`audit`** - Audit trails and change tracking

## Security Features

- **Row Level Security (RLS)** enabled on PII tables
- **Service role** (`svc_quanta`) for application access
- **Redacted views** for safe data access
- **Audit trails** for change tracking

## Available Commands

```bash
pnpm run db:up     # Apply all pending migrations
pnpm run db:down   # Rollback last migration
pnpm run db:new    # Create new migration file
pnpm run db:seed   # Seed database with initial data
pnpm run db:setup  # Complete database setup
```

## Database URL

For local development:

```
postgres://qp:qp@localhost:5432/quantapilot?sslmode=disable
```

## Docker Compose

The database runs in Docker with:

- PostgreSQL 15
- Health checks
- Volume persistence
- Automatic initialization scripts

## Migrations

Migrations are managed with `dbmate` and stored in `db/migrations/`.
Each migration is versioned and can be rolled back.

## Seed Data

Seed data is in `db/seeds/seed.sql` and includes:

- Example users with PII
- RLS policies
- Redacted views for safe access

## Development Workflow

1. Create new migration: `pnpm run db:new migration_name`
2. Edit the generated migration file
3. Apply migration: `pnpm run db:up`
4. Test with seed data: `pnpm run db:seed`
