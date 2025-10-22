#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - k3d Kubernetes Launcher
# Starts the k3d (Kubernetes) deployment

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting k3d (Kubernetes) Deployment ===${NC}"
echo ""

# Check if Docker Compose is running and stop it
if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "${YELLOW}Docker Compose services detected. Stopping them...${NC}"
    docker compose down
    echo ""
fi

# Start k3d deployment
echo -e "${GREEN}Starting k3d cluster and deployment...${NC}"
./k8s/scripts/k3d-up.sh

echo ""
echo -e "${GREEN}✓ k3d deployment started!${NC}"
echo ""
