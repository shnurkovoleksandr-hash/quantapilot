#!/bin/bash

# QuantaPilot™ Health Check Script
# Checks the health of all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    if curl -f -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        print_success "$name is healthy"
        return 0
    else
        print_error "$name is not responding"
        return 1
    fi
}

# Function to check Docker container
check_container() {
    local container_name=$1
    
    if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
        print_success "$container_name container is running"
        return 0
    else
        print_error "$container_name container is not running"
        return 1
    fi
}

# Function to check database connection
check_database() {
    local container_name="quantapilot_postgres"
    
    if docker exec "$container_name" pg_isready -U quantapilot >/dev/null 2>&1; then
        print_success "PostgreSQL database is ready"
        return 0
    else
        print_error "PostgreSQL database is not ready"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    local container_name="quantapilot_redis"
    
    if docker exec "$container_name" redis-cli ping | grep -q "PONG"; then
        print_success "Redis is responding"
        return 0
    else
        print_error "Redis is not responding"
        return 1
    fi
}

# Main health check
main() {
    echo "======================================"
    echo "    QuantaPilot™ Health Check"
    echo "======================================"
    echo ""
    
    overall_status=0
    
    print_status "Checking container status..."
    check_container "quantapilot_postgres" || overall_status=1
    check_container "quantapilot_redis" || overall_status=1
    check_container "quantapilot_n8n" || overall_status=1
    check_container "quantapilot_api_gateway" || overall_status=1
    check_container "quantapilot_cursor_service" || overall_status=1
    check_container "quantapilot_github_service" || overall_status=1
    check_container "quantapilot_notification_service" || overall_status=1
    check_container "quantapilot_dashboard" || overall_status=1
    
    echo ""
    print_status "Checking database connections..."
    check_database || overall_status=1
    check_redis || overall_status=1
    
    echo ""
    print_status "Checking service endpoints..."
    check_http_endpoint "API Gateway" "http://localhost:3000/health" || overall_status=1
    check_http_endpoint "Cursor Service" "http://localhost:3001/health" || overall_status=1
    check_http_endpoint "GitHub Service" "http://localhost:3002/health" || overall_status=1
    check_http_endpoint "Notification Service" "http://localhost:3003/health" || overall_status=1
    check_http_endpoint "Web Dashboard" "http://localhost:3004/health" || overall_status=1
    check_http_endpoint "n8n" "http://localhost:5678/healthz" || overall_status=1
    
    echo ""
    print_status "Checking optional monitoring services..."
    if docker ps --filter "name=quantapilot_prometheus" --filter "status=running" | grep -q "quantapilot_prometheus"; then
        check_http_endpoint "Prometheus" "http://localhost:9090/-/healthy" || print_warning "Prometheus health check failed"
    else
        print_warning "Prometheus is not running (optional service)"
    fi
    
    if docker ps --filter "name=quantapilot_grafana" --filter "status=running" | grep -q "quantapilot_grafana"; then
        check_http_endpoint "Grafana" "http://localhost:3005/api/health" || print_warning "Grafana health check failed"
    else
        print_warning "Grafana is not running (optional service)"
    fi
    
    echo ""
    if [ $overall_status -eq 0 ]; then
        print_success "All core services are healthy!"
        
        # Show resource usage
        echo ""
        print_status "Resource usage:"
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep quantapilot
        
    else
        print_error "Some services are not healthy. Check the logs for more details:"
        echo "  docker-compose logs <service-name>"
        exit 1
    fi
    
    echo ""
    print_status "Service URLs:"
    echo "  - n8n Dashboard: http://localhost:5678"
    echo "  - API Gateway: http://localhost:3000"
    echo "  - Web Dashboard: http://localhost:3004"
    echo "  - Prometheus: http://localhost:9090 (if enabled)"
    echo "  - Grafana: http://localhost:3005 (if enabled)"
}

# Run health check
main "$@"
