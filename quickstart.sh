#!/bin/bash

# Quick start script for Apollo Router + Dash0 Demo
# This script automates the entire setup process

set -e

echo "🚀 Apollo Router + Dash0 Demo - Quick Start"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker Desktop."
    exit 1
fi
print_success "Docker is installed"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not available. Please update Docker."
    exit 1
fi
print_success "Docker Compose is available"

# Check Rover
if ! command -v rover &> /dev/null; then
    print_warning "Apollo Rover CLI is not installed."
    echo "   Install it with: curl -sSL https://rover.apollo.dev/nix/latest | sh"
    echo ""
    read -p "Continue without Rover? (You'll need to install it later) [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    print_success "Apollo Rover CLI is installed"
fi

echo ""
echo "🔧 Configuration Check"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found"
    echo "   Creating .env from .env.sample..."
    cp .env.sample .env
    print_warning "Please edit .env and add your Dash0 credentials:"
    echo "   - DASH0_AUTH_TOKEN"
    echo "   - DASH0_REGION"
    echo ""
    read -p "Continue anyway? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please edit .env and add your Dash0 token, then run this script again."
        exit 1
    fi
else
    print_success ".env file found"
fi

# Check if Dash0 token is configured in .env
if grep -q "your-dash0-token-here" .env; then
    print_warning "Dash0 token not configured in .env"
    echo "   Please update .env with your Dash0 credentials."
    echo ""
    read -p "Continue anyway? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Please edit .env and add your Dash0 token, then run this script again."
        exit 1
    fi
else
    print_success "Dash0 configuration found in .env"
fi

echo ""
echo "🏗️  Building and starting services..."
echo ""

# Build and start subgraphs
echo "📦 Building subgraph Docker images..."
docker compose build accounts products reviews inventory

echo ""
echo "🚀 Starting subgraphs..."
docker compose up -d accounts products reviews inventory

echo ""
echo "⏳ Waiting for subgraphs to be healthy (this may take 30-60 seconds)..."

# Wait for subgraphs to be healthy
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    HEALTHY=$(docker compose ps --format json | jq -r 'select(.Service == "accounts" or .Service == "products" or .Service == "reviews" or .Service == "inventory") | .Health' | grep -c "healthy" || echo "0")

    if [ "$HEALTHY" -eq "4" ]; then
        break
    fi

    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done

echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    print_error "Subgraphs did not become healthy in time"
    echo "Check the logs with: docker compose logs"
    exit 1
fi

print_success "All subgraphs are healthy"

echo ""
echo "🔨 Composing supergraph schema..."

if command -v rover &> /dev/null; then
    ./compose-supergraph.sh
else
    print_warning "Skipping supergraph composition (Rover not installed)"
    echo "   You'll need to install Rover and run: ./compose-supergraph.sh"
fi

echo ""
echo "🚀 Starting Apollo Router..."
docker compose up -d router

echo ""
echo "⏳ Waiting for router to be ready..."
sleep 5

# Check if router is healthy
if curl -s -f http://localhost:8088/health > /dev/null 2>&1; then
    print_success "Apollo Router is running"
else
    print_warning "Router health check failed, but it may still be starting..."
fi

echo ""
echo "=================================="
print_success "Setup complete!"
echo "=================================="
echo ""
echo "🎉 Your Apollo Router + Dash0 demo is running!"
echo ""
echo "Next steps:"
echo ""
echo "  1. Access Apollo Sandbox:"
echo "     → http://localhost:4000"
echo ""
echo "  2. Try this federated query:"
echo "     query {"
echo "       topProducts(limit: 3) {"
echo "         name"
echo "         reviews { rating author { name } }"
echo "         inventory { quantity }"
echo "       }"
echo "     }"
echo ""
echo "  3. Start load generation (optional):"
echo "     → docker compose --profile load-testing up -d vegeta"
echo ""
echo "  4. Check your Dash0 dashboard for metrics and traces"
echo ""
echo "Useful commands:"
echo "  • View logs: docker compose logs -f"
echo "  • Stop all: docker compose down"
echo "  • Restart: docker compose restart"
echo ""
echo "For more information, see SETUP.md"
echo ""
