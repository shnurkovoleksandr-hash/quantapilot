#!/bin/bash
set -e

# QuantaPilot™ Setup Script
# This script sets up the QuantaPilot development environment

echo "🚀 Setting up QuantaPilot™..."

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

# Check if Docker is installed
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env_file() {
    print_status "Checking environment configuration..."
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your actual configuration values"
        return 1
    fi
    print_success "Environment file exists"
    return 0
}

# Validate required environment variables
validate_env() {
    print_status "Validating environment variables..."
    source .env
    
    required_vars=(
        "CURSOR_API_KEY"
        "GITHUB_TOKEN"
        "TELEGRAM_BOT_TOKEN"
        "POSTGRES_PASSWORD"
        "JWT_SECRET"
    )
    
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [ "${!var}" = "your_${var,,}_here" ] || [ "${!var}" = "changeme123!" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "The following environment variables need to be configured:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    print_success "All required environment variables are configured"
    return 0
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    directories=(
        "logs/api-gateway"
        "logs/cursor-service"
        "logs/github-service"
        "logs/notification-service"
        "logs/dashboard"
        "backups"
        "storage"
        "n8n/workflows"
        "n8n/nodes"
        "monitoring/prometheus"
        "monitoring/grafana/provisioning/dashboards"
        "monitoring/grafana/provisioning/datasources"
        "templates/email"
        "prompts"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
    done
    
    print_success "Directories created"
}

# Set up database initialization script
setup_db_script() {
    print_status "Setting up database initialization script..."
    
    cat > scripts/create-multiple-databases.sh << 'EOF'
#!/bin/bash
set -e
set -u

function create_user_and_database() {
    local database=$1
    local user=$2
    local password=$3
    echo "Creating user '$user' and database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE USER $user WITH PASSWORD '$password';
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $user;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        if [ "$db" = "n8n" ]; then
            create_user_and_database $db $db "${N8N_POSTGRES_PASSWORD:-n8n_password}"
        fi
    done
    echo "Multiple databases created"
fi
EOF
    
    chmod +x scripts/create-multiple-databases.sh
    print_success "Database script created"
}

# Pull required Docker images
pull_images() {
    print_status "Pulling required Docker images..."
    docker-compose pull postgres redis n8n
    print_success "Docker images pulled"
}

# Build custom services
build_services() {
    print_status "Building custom services..."
    
    # Create basic Dockerfiles for services if they don't exist
    services=("api-gateway" "cursor-integration" "github-integration" "notifications" "dashboard")
    
    for service in "${services[@]}"; do
        if [ ! -f "services/$service/Dockerfile" ]; then
            print_status "Creating basic Dockerfile for $service..."
            mkdir -p "services/$service"
            cat > "services/$service/Dockerfile" << EOF
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["npm", "start"]
EOF
            
            # Create basic package.json
            cat > "services/$service/package.json" << EOF
{
  "name": "quantapilot-$service",
  "version": "1.0.0",
  "description": "QuantaPilot $service service",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.3.1"
  }
}
EOF
            
            # Create basic index.js
            cat > "services/$service/index.js" << EOF
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'quantapilot-$service',
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({ 
    message: 'QuantaPilot $service Service',
    version: '1.0.0'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`$service service running on port \${PORT}\`);
});
EOF
        fi
    done
    
    print_success "Service templates created"
}

# Initialize monitoring configuration
setup_monitoring() {
    print_status "Setting up monitoring configuration..."
    
    # Prometheus configuration
    cat > monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'quantapilot-api-gateway'
    static_configs:
      - targets: ['api-gateway:3000']

  - job_name: 'quantapilot-cursor-service'
    static_configs:
      - targets: ['cursor-service:3001']

  - job_name: 'quantapilot-github-service'
    static_configs:
      - targets: ['github-service:3002']

  - job_name: 'quantapilot-notification-service'
    static_configs:
      - targets: ['notification-service:3003']

  - job_name: 'n8n'
    static_configs:
      - targets: ['n8n:5678']
EOF
    
    # Grafana datasource configuration
    mkdir -p monitoring/grafana/provisioning/datasources
    cat > monitoring/grafana/provisioning/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
EOF
    
    print_success "Monitoring configuration created"
}

# Main setup process
main() {
    echo "======================================"
    echo "    QuantaPilot™ Setup Script"
    echo "======================================"
    echo ""
    
    check_docker
    
    env_needs_config=false
    if ! check_env_file; then
        env_needs_config=true
    fi
    
    create_directories
    setup_db_script
    setup_monitoring
    build_services
    
    if $env_needs_config || ! validate_env; then
        echo ""
        print_warning "Setup completed, but environment configuration is needed."
        print_warning "Please edit the .env file with your actual values before starting the services."
        echo ""
        print_status "After configuring .env, start QuantaPilot with:"
        echo "  docker-compose up -d"
        exit 1
    fi
    
    pull_images
    
    echo ""
    print_success "QuantaPilot™ setup completed successfully!"
    echo ""
    print_status "To start QuantaPilot™:"
    echo "  docker-compose up -d"
    echo ""
    print_status "To monitor services:"
    echo "  docker-compose logs -f"
    echo ""
    print_status "To access services:"
    echo "  - n8n Dashboard: http://localhost:5678"
    echo "  - API Gateway: http://localhost:3000"
    echo "  - Web Dashboard: http://localhost:3004"
    echo ""
    print_status "To enable monitoring:"
    echo "  docker-compose --profile monitoring up -d"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Grafana: http://localhost:3005"
    echo ""
}

# Run main function
main "$@"
