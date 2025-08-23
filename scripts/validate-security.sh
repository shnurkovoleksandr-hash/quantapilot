#!/bin/bash
# QuantaPilot™ Security Validation Script
# Validates that security configurations are properly set up

set -e

echo "🔍 QuantaPilot™ Security Validation"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validation results
ERRORS=0
WARNINGS=0

# Function to log errors
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "🔍 Checking environment configuration..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    log_error ".env file not found. Copy .env.example to .env and configure it."
else
    log_success ".env file exists"
    
    # Source .env for validation
    source .env
    
    # Check critical environment variables
    echo "🔍 Validating critical environment variables..."
    
    # JWT Secret validation
    if [ -z "$JWT_SECRET" ] || [ ${#JWT_SECRET} -lt 32 ]; then
        log_error "JWT_SECRET is missing or too short (minimum 32 characters)"
    else
        log_success "JWT_SECRET is configured"
    fi
    
    # Database password validation
    if [ -z "$POSTGRES_PASSWORD" ] || [ ${#POSTGRES_PASSWORD} -lt 12 ]; then
        log_error "POSTGRES_PASSWORD is missing or too short (minimum 12 characters)"
    else
        log_success "POSTGRES_PASSWORD is configured"
    fi
    
    # API Keys validation
    if [ -z "$CURSOR_API_KEY" ]; then
        log_warning "CURSOR_API_KEY is not set. AI functionality will not work."
    else
        log_success "CURSOR_API_KEY is configured"
    fi
    
    if [ -z "$GITHUB_TOKEN" ]; then
        log_warning "GITHUB_TOKEN is not set. GitHub integration will not work."
    else
        log_success "GITHUB_TOKEN is configured"
    fi
    
    # Webhook secrets validation
    if [ -z "$GITHUB_WEBHOOK_SECRET" ]; then
        log_warning "GITHUB_WEBHOOK_SECRET is not set. Webhook security is compromised."
    else
        log_success "GITHUB_WEBHOOK_SECRET is configured"
    fi
    
    # Check if production environment has secure settings
    if [ "$NODE_ENV" = "production" ]; then
        echo "🔍 Validating production security settings..."
        
        if [ "$N8N_BASIC_AUTH_ACTIVE" != "true" ]; then
            log_error "n8n basic auth should be enabled in production"
        fi
        
        if [ "$DEBUG_MODE" = "true" ]; then
            log_warning "DEBUG_MODE should be false in production"
        fi
        
        if [ "$LOG_LEVEL" = "debug" ]; then
            log_warning "LOG_LEVEL should not be 'debug' in production"
        fi
    fi
fi

echo ""
echo "🔍 Checking Docker security configuration..."

# Check Docker compose file for security issues
if [ -f "docker-compose.yml" ]; then
    log_success "docker-compose.yml exists"
    
    # Check for hardcoded secrets
    if grep -q "changeme\|password123\|admin123" docker-compose.yml; then
        log_error "docker-compose.yml contains hardcoded default passwords"
    else
        log_success "No hardcoded passwords found in docker-compose.yml"
    fi
    
    # Check for proper user configuration in Dockerfiles
    echo "🔍 Checking Dockerfiles for security..."
    
    find services -name "Dockerfile" | while read dockerfile; do
        if grep -q "USER" "$dockerfile"; then
            log_success "$dockerfile: Uses non-root user"
        else
            log_warning "$dockerfile: Should specify non-root USER"
        fi
        
        if grep -q "HEALTHCHECK" "$dockerfile"; then
            log_success "$dockerfile: Has health check configured"
        else
            log_warning "$dockerfile: Should include HEALTHCHECK"
        fi
    done
fi

echo ""
echo "🔍 Checking file permissions..."

# Check secrets directory permissions
if [ -d "secrets" ]; then
    if [ "$(stat -c %a secrets)" = "700" ] || [ "$(stat -f %A secrets)" = "700" ]; then
        log_success "secrets/ directory has correct permissions (700)"
    else
        log_warning "secrets/ directory should have 700 permissions"
    fi
    
    # Check individual secret files
    find secrets -name "*.secret" | while read secret_file; do
        if [ "$(stat -c %a "$secret_file")" = "600" ] || [ "$(stat -f %A "$secret_file")" = "600" ]; then
            log_success "$secret_file: Correct permissions (600)"
        else
            log_error "$secret_file: Should have 600 permissions"
        fi
    done
else
    log_warning "secrets/ directory not found. Run ./scripts/generate-secrets.sh to create it."
fi

echo ""
echo "🔍 Checking network security..."

# Check for proper network isolation in docker-compose
if grep -q "quantapilot_network" docker-compose.yml; then
    log_success "Services use isolated Docker network"
else
    log_warning "Services should use an isolated Docker network"
fi

echo ""
echo "🔍 Checking dependencies for known vulnerabilities..."

# Check if npm audit is available and run it
if command -v npm >/dev/null 2>&1; then
    # Run npm audit for each service
    for service_dir in services/*/; do
        if [ -f "$service_dir/package.json" ]; then
            echo "Checking $service_dir..."
            cd "$service_dir"
            if npm audit --audit-level moderate >/dev/null 2>&1; then
                log_success "$service_dir: No known vulnerabilities"
            else
                log_warning "$service_dir: Has known vulnerabilities. Run 'npm audit fix'"
            fi
            cd - >/dev/null
        fi
    done
else
    log_warning "npm not found. Cannot check for dependency vulnerabilities."
fi

echo ""
echo "📊 Security Validation Summary"
echo "=============================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All security checks passed!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found. Review and address them.${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found.${NC}"
    echo ""
    echo "🔧 Recommended actions:"
    echo "   1. Fix all errors before deploying to production"
    echo "   2. Review and address warnings"
    echo "   3. Run './scripts/generate-secrets.sh' to create secure secrets"
    echo "   4. Ensure .env file is properly configured"
    echo "   5. Review Docker security configurations"
    exit 1
fi
