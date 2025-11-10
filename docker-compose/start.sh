#!/bin/bash

set -e

# Apollo Router Demo - Docker Compose Start Script
# Usage: ./start.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Starting Docker Compose Services ===${NC}"
echo ""

# Check if .env exists
if [ ! -f ../.env ]; then
    echo -e "${RED}Error: ../.env not found!${NC}"
    echo "Please create .env file at the project root"
    exit 1
fi

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✓ Services started!${NC}"
echo ""
echo -e "${BLUE}=== Service URLs ===${NC}"
echo "  GraphQL Router:  http://localhost:4000/graphql"
echo "  GraphQL Sandbox: http://localhost:4000/"
echo "  Accounts:        http://localhost:4001/graphql"
echo "  Reviews:         http://localhost:4002/graphql"
echo "  Products (Python): http://localhost:4003/graphql"
echo "  Inventory:       http://localhost:4004/graphql"
echo "  PostgreSQL:      localhost:5432"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  docker-compose logs -f          # Follow logs"
echo "  docker-compose ps               # Show services"
echo "  docker-compose down             # Stop all services"
echo ""
