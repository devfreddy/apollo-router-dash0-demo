#!/bin/bash

# Apollo Router Demo - Kubernetes (k3d) Start Script
# Usage: ./start.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Starting Kubernetes Cluster ===${NC}"
echo ""

if [ ! -f scripts/k3d-up.sh ]; then
    echo -e "${RED}Error: scripts/k3d-up.sh not found${NC}"
    echo "Please run from the kubernetes/ directory"
    exit 1
fi

./scripts/k3d-up.sh

echo ""
echo -e "${GREEN}✓ Kubernetes cluster started!${NC}"
echo ""

echo "Starting local port forwards..."
./scripts/local-port-forwards.sh start
echo ""
