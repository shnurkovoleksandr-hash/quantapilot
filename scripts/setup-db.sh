#!/bin/bash

# Database setup script for QuantaPilot
set -e

echo "🚀 Setting up QuantaPilot database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "📝 Setting DATABASE_URL for local development..."
    export DATABASE_URL="postgres://qp:qp@localhost:5432/quantapilot?sslmode=disable"
fi

# Start database if not running
if ! docker ps | grep -q "postgres:15"; then
    echo "🐳 Starting PostgreSQL container..."
    docker-compose -f ops/docker/docker-compose.yml up -d db
    
    echo "⏳ Waiting for database to be ready..."
    sleep 10
fi

# Run migrations
echo "📊 Running database migrations..."
pnpm run db:up

# Copy seed file to container
echo "📋 Copying seed file..."
docker cp db/seeds/seed.sql docker-db-1:/tmp/seed.sql

# Seed data
echo "🌱 Seeding database..."
pnpm run db:seed

echo "✅ Database setup complete!"
echo "📊 Database URL: $DATABASE_URL"
echo "🔧 Available commands:"
echo "   pnpm run db:up     - Run migrations"
echo "   pnpm run db:down   - Rollback migrations"
echo "   pnpm run db:new    - Create new migration"
echo "   pnpm run db:seed   - Seed database"
