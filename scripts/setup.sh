#!/bin/bash
# QuantaPilot™ Setup Script
# Initializes the development environment and starts all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "██████╗ ██╗   ██╗ █████╗ ███╗   ██╗████████╗ █████╗ ██████╗ ██╗██╗      ██████╗ ████████╗™"
echo "██╔═══██╗██║   ██║██╔══██╗████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝"
echo "██║   ██║██║   ██║███████║██╔██╗ ██║   ██║   ███████║██████╔╝██║██║     ██║   ██║   ██║   "
echo "██║▄▄ ██║██║   ██║██╔══██║██║╚██╗██║   ██║   ██╔══██║██╔═══╝ ██║██║     ██║   ██║   ██║   "
echo "╚██████╔╝╚██████╔╝██║  ██║██║ ╚████║   ██║   ██║  ██║██║     ██║███████╗╚██████╔╝   ██║   "
echo " ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝   "
echo -e "${NC}"
echo -e "${CYAN}🚀 Autonomous Project Factory Setup${NC}"
echo "===================================="
echo ""

# Function to log messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed and running
log_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker is not running. Please start Docker first."
    exit 1
fi

log_success "Docker is installed and running"

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

log_success "Docker Compose is available"

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p logs/api-gateway
mkdir -p logs/cursor-service
mkdir -p logs/github-service
mkdir -p logs/notification-service
mkdir -p logs/dashboard
mkdir -p templates/email
mkdir -p prompts
log_success "Directories created"

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_warning ".env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        log_success ".env file created from template"
        log_warning "Please edit .env file and configure your API keys and settings"
    else
        log_error ".env.example not found. Cannot create .env file."
        exit 1
    fi
else
    log_success ".env file exists"
fi

# Ask user if they want to generate secrets
read -p "🔐 Do you want to generate secure secrets? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Generating secure secrets..."
    ./scripts/generate-secrets.sh
    log_info "Please update your .env file with the generated secrets"
    read -p "Press Enter to continue after updating .env..."
fi

# Validate security configuration
log_info "Validating security configuration..."
if ./scripts/validate-security.sh; then
    log_success "Security validation passed"
else
    log_warning "Security validation found issues. Please review and fix them."
    read -p "Do you want to continue anyway? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Setup cancelled. Please fix security issues and run setup again."
        exit 1
    fi
fi

# Build and start services
log_info "Building and starting QuantaPilot™ services..."
echo "This may take a few minutes on first run..."

# Use docker-compose or docker compose based on availability
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

# Start infrastructure services first
log_info "Starting infrastructure services (PostgreSQL, Redis)..."
$DOCKER_COMPOSE up -d postgres redis

# Wait for infrastructure to be ready
log_info "Waiting for infrastructure services to be healthy..."
for i in {1..30}; do
    if $DOCKER_COMPOSE ps postgres | grep -q "healthy" && $DOCKER_COMPOSE ps redis | grep -q "healthy"; then
        log_success "Infrastructure services are healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        log_error "Infrastructure services failed to start properly"
        $DOCKER_COMPOSE logs postgres redis
        exit 1
    fi
    echo -n "."
    sleep 2
done

# Initialize database
log_info "Initializing database..."
if [ -f "scripts/init-database.sh" ]; then
    # Run database initialization
    $DOCKER_COMPOSE exec -T postgres bash -c "
        export POSTGRES_USER=\${POSTGRES_USER}
        export POSTGRES_DB=\${POSTGRES_DB}
        export POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
        /scripts/init-database.sh
    " || log_warning "Database initialization script not available"
fi

# Start remaining services
log_info "Starting application services..."
$DOCKER_COMPOSE up -d

# Wait for all services to be ready
log_info "Waiting for all services to be ready..."
sleep 10

# Check service status
log_info "Checking service status..."
$DOCKER_COMPOSE ps

# Show service URLs
echo ""
log_success "🎉 QuantaPilot™ setup completed!"
echo ""
echo -e "${CYAN}📋 Service URLs:${NC}"
echo "  🌐 Dashboard:     http://localhost:3004"
echo "  🔧 API Gateway:   http://localhost:3000"
echo "  🤖 AI Service:    http://localhost:3001"
echo "  📊 GitHub API:    http://localhost:3002"
echo "  📧 Notifications: http://localhost:3003"
echo "  🔄 n8n Workflows: http://localhost:5678"
echo "  📈 Prometheus:    http://localhost:9090"
echo "  📊 Grafana:       http://localhost:3005"
echo ""
echo -e "${CYAN}🔐 Default Credentials:${NC}"
echo "  n8n:     admin / changeme123!"
echo "  Grafana: admin / admin123"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "  1. Configure your API keys in .env file"
echo "  2. Visit the dashboard at http://localhost:3004"
echo "  3. Set up your first project in n8n at http://localhost:5678"
echo "  4. Review monitoring dashboards in Grafana"
echo ""
echo -e "${GREEN}🚀 QuantaPilot™ is ready for autonomous development!${NC}"
echo ""
echo "Run '${DOCKER_COMPOSE} logs -f' to view all service logs"
echo "Run '${DOCKER_COMPOSE} down' to stop all services"