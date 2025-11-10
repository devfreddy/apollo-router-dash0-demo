#!/bin/bash

set -e

# Apollo Router Demo - Docker Compose Stop Script
# Usage: ./stop.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Stopping Docker Compose Services ===${NC}"
echo ""

if docker-compose ps 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "${YELLOW}Stopping services...${NC}"
    docker-compose down
    echo -e "${GREEN}✓ Services stopped${NC}"
else
    echo -e "${YELLOW}No services running${NC}"
fi

echo ""
