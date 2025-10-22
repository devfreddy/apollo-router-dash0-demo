#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Docker Compose Launcher
# Starts the Docker Compose deployment

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Docker Compose Deployment ===${NC}"
echo ""

# Check if k3d is running and optionally stop it
if command -v k3d &> /dev/null && k3d cluster list 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "${YELLOW}k3d cluster detected. Stopping it...${NC}"
    read -p "Stop k3d cluster? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./k8s/scripts/k3d-down.sh
    fi
fi

# Start Docker Compose
echo -e "${GREEN}Starting Docker Compose services...${NC}"
docker compose up -d

echo ""
echo -e "${GREEN}✓ Docker Compose deployment started!${NC}"
echo ""
echo -e "Services running:"
docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo -e "GraphQL API: ${YELLOW}http://localhost:4000${NC}"
echo ""
