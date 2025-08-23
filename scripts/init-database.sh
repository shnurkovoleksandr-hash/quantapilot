#!/bin/bash

# ==============================================
# QuantaPilot Database Initialization Script
# ==============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
    print_success "docker-compose is available"
}

# Function to load environment variables
load_env() {
    if [ -f .env ]; then
        print_status "Loading environment variables from .env file"
        export $(cat .env | grep -v '^#' | xargs)
    else
        print_warning "No .env file found. Using default values."
        export POSTGRES_USER=quantapilot
        export POSTGRES_PASSWORD=quantapilot_password
        export POSTGRES_DB=quantapilot
        export N8N_POSTGRES_USER=n8n
        export N8N_POSTGRES_PASSWORD=n8n_password
    fi
}

# Function to wait for database to be ready
wait_for_database() {
    print_status "Waiting for PostgreSQL to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T postgres pg_isready -U "${POSTGRES_USER:-quantapilot}" > /dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            return 0
        fi
        
        print_status "Attempt $attempt/$max_attempts: PostgreSQL not ready yet, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "PostgreSQL failed to start within $max_attempts attempts"
    return 1
}

# Function to create databases
create_databases() {
    print_status "Creating databases..."
    
    # Create main database
    docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -c "
        CREATE DATABASE IF NOT EXISTS quantapilot;
        CREATE DATABASE IF NOT EXISTS n8n;
    " || print_warning "Databases might already exist"
    
    print_success "Databases created"
}

# Function to apply schema
apply_schema() {
    print_status "Applying database schema..."
    
    if [ -f database/schema.sql ]; then
        docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -f /docker-entrypoint-initdb.d/schema.sql
        print_success "Database schema applied"
    else
        print_error "Schema file database/schema.sql not found"
        exit 1
    fi
}

# Function to verify schema
verify_schema() {
    print_status "Verifying database schema..."
    
    # Check if main tables exist
    local tables=("projects" "users" "workflows" "ai_sessions" "ai_prompts" "hitl_decisions")
    
    for table in "${tables[@]}"; do
        if docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -c "\dt $table" > /dev/null 2>&1; then
            print_success "Table $table exists"
        else
            print_error "Table $table does not exist"
            return 1
        fi
    done
    
    print_success "Database schema verification completed"
}

# Function to create initial data
create_initial_data() {
    print_status "Creating initial data..."
    
    # Check if admin user exists
    local admin_count=$(docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@quantapilot.com';" | tr -d ' ')
    
    if [ "$admin_count" -eq "0" ]; then
        docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -c "
            INSERT INTO users (email, name, role) VALUES ('admin@quantapilot.com', 'System Administrator', 'admin');
        "
        print_success "Admin user created"
    else
        print_status "Admin user already exists"
    fi
    
    print_success "Initial data created"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    if [ -d database/migrations ]; then
        for migration in database/migrations/*.sql; do
            if [ -f "$migration" ]; then
                print_status "Applying migration: $(basename "$migration")"
                docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -f "/docker-entrypoint-initdb.d/migrations/$(basename "$migration")"
            fi
        done
        print_success "Database migrations completed"
    else
        print_status "No migrations directory found, skipping migrations"
    fi
}

# Function to create database backup
create_backup() {
    print_status "Creating database backup..."
    
    local backup_dir="backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/database_backup_$timestamp.sql"
    
    mkdir -p "$backup_dir"
    
    docker-compose exec -T postgres pg_dump -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" > "$backup_file"
    
    if [ $? -eq 0 ]; then
        print_success "Database backup created: $backup_file"
    else
        print_error "Failed to create database backup"
    fi
}

# Function to show database status
show_status() {
    print_status "Database status:"
    
    echo "PostgreSQL:"
    docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -c "
        SELECT 
            schemaname,
            tablename,
            tableowner
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
    "
    
    echo "Users:"
    docker-compose exec -T postgres psql -U "${POSTGRES_USER:-quantapilot}" -d "${POSTGRES_DB:-quantapilot}" -c "
        SELECT id, email, name, role, created_at FROM users;
    "
}

# Main function
main() {
    echo "=============================================="
    echo "QuantaPilot Database Initialization"
    echo "=============================================="
    
    # Check prerequisites
    check_docker
    check_docker_compose
    
    # Load environment variables
    load_env
    
    # Start services if not running
    if ! docker-compose ps | grep -q "postgres.*Up"; then
        print_status "Starting Docker services..."
        docker-compose up -d postgres redis
    fi
    
    # Wait for database
    wait_for_database
    
    # Create databases
    create_databases
    
    # Apply schema
    apply_schema
    
    # Run migrations
    run_migrations
    
    # Create initial data
    create_initial_data
    
    # Verify schema
    verify_schema
    
    # Create backup
    create_backup
    
    # Show status
    show_status
    
    print_success "Database initialization completed successfully!"
    echo ""
    print_status "You can now start the full system with: docker-compose up -d"
}

# Handle command line arguments
case "${1:-}" in
    "status")
        load_env
        show_status
        ;;
    "backup")
        load_env
        create_backup
        ;;
    "reset")
        print_warning "This will reset the database. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            print_status "Resetting database..."
            docker-compose down -v
            docker-compose up -d postgres redis
            wait_for_database
            create_databases
            apply_schema
            create_initial_data
            print_success "Database reset completed"
        else
            print_status "Database reset cancelled"
        fi
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Initialize database (default)"
        echo "  status     Show database status"
        echo "  backup     Create database backup"
        echo "  reset      Reset database (WARNING: destroys all data)"
        echo "  help       Show this help message"
        ;;
    *)
        main
        ;;
esac
