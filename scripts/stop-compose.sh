#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Docker Compose Stopper
# Stops the Docker Compose deployment

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Stopping Docker Compose Deployment ===${NC}"
echo ""

# Check if Docker Compose services are running
if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "${YELLOW}Stopping Docker Compose services...${NC}"
    docker compose down
    echo ""
    echo -e "${GREEN}✓ Docker Compose services stopped!${NC}"
else
    echo -e "${RED}No Docker Compose services running${NC}"
fi

echo ""
