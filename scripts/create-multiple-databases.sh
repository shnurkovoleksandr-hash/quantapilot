#!/bin/bash
# QuantaPilot™ Database Initialization Script
# Creates multiple databases for PostgreSQL container
# Required for both QuantaPilot™ and n8n

set -e
set -u

function create_user_and_database() {
	local database=$1
	local user=$2
	local password=$3
	
	echo "  Creating user '$user' and database '$database'"
	
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
		CREATE USER "$user" WITH PASSWORD '$password';
		CREATE DATABASE "$database";
		GRANT ALL PRIVILEGES ON DATABASE "$database" TO "$user";
		\c "$database"
		GRANT ALL ON SCHEMA public TO "$user";
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
	
	# Create n8n database and user
	create_user_and_database "n8n" "${N8N_POSTGRES_USER:-n8n}" "${N8N_POSTGRES_PASSWORD:-n8n_password}"
	
	echo "Multiple databases created"
fi
