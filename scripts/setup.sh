#!/bin/bash

set -e

echo "🚀 Setting up QuantaPilot Stage 1..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_status "Prerequisites check passed"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    print_warning "Creating .env file from .env.example"
    cp .env.example .env
    print_warning "Please update .env file with your actual values"
else
    print_status ".env file already exists"
fi

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
npm install
cd ..

# Create logs directory
mkdir -p backend/logs

# Build the backend
print_status "Building backend..."
cd backend
npm run build
cd ..

# Start the infrastructure
print_status "Starting Docker infrastructure..."
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
print_status "Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is ready
until docker-compose exec -T postgres pg_isready -U quantapilot; do
    print_warning "Waiting for PostgreSQL..."
    sleep 2
done

print_status "PostgreSQL is ready!"

# Run database migrations
print_status "Running database migrations..."
docker-compose exec -T postgres psql -U quantapilot -d quantapilot -f /docker-entrypoint-initdb.d/001_initial_schema.sql

# Start the backend
print_status "Starting backend service..."
docker-compose up -d backend

# Wait for backend to be ready
print_status "Waiting for backend to be ready..."
sleep 5

# Test health endpoint
print_status "Testing health endpoint..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    print_status "Backend health check passed!"
else
    print_error "Backend health check failed. Check logs with: docker-compose logs backend"
    exit 1
fi

# Start n8n
print_status "Starting n8n..."
docker-compose up -d n8n

print_status "Setup completed successfully!"
echo ""
echo "🌐 Services available at:"
echo "   - Backend API: http://localhost:3000"
echo "   - Backend Health: http://localhost:3000/health"
echo "   - n8n: http://localhost:5678"
echo "   - PostgreSQL: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env file with your actual API keys and tokens"
echo "   2. Access n8n at http://localhost:5678 to set up workflows"
echo "   3. Check backend logs: docker-compose logs backend"
echo ""
echo "🛠️  Useful commands:"
echo "   - Stop all services: docker-compose down"
echo "   - View logs: docker-compose logs -f [service_name]"
echo "   - Restart backend: docker-compose restart backend"
