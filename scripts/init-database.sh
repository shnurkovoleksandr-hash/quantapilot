#!/bin/bash
# QuantaPilot™ Database Initialization Script
# Initializes the PostgreSQL database with schema and initial data

set -e

echo "🗄️  Initializing QuantaPilot™ Database..."

# Wait for PostgreSQL to be ready
until PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -c '\q' 2>/dev/null; do
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 2
done

echo "✅ PostgreSQL is ready"

# Check if database is already initialized
if PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects';" | grep -q "1"; then
  echo "📋 Database already initialized, skipping schema creation"
else
  echo "🔧 Creating database schema..."
  PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -f /app/database/schema.sql
  echo "✅ Database schema created successfully"
fi

echo "🎉 Database initialization completed!"