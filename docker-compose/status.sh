#!/bin/bash

# Apollo Router Demo - Docker Compose Status Script
# Usage: ./status.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Docker Compose Status ===${NC}"
echo ""

if ! command -v docker-compose &> /dev/null && ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker or docker-compose not found${NC}"
    exit 1
fi

echo -e "${BLUE}Services:${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}Network:${NC}"
docker network ls | grep apollo-dash0-network || echo "Network not found"

echo ""
