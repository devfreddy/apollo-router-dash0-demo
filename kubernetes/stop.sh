#!/bin/bash

set -e

# Apollo Router Demo - Kubernetes (k3d) Stop Script
# Usage: ./stop.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Stopping Kubernetes Cluster ===${NC}"
echo ""

if [ ! -f scripts/k3d-down.sh ]; then
    echo -e "${RED}Error: scripts/k3d-down.sh not found${NC}"
    echo "Please run from the kubernetes/ directory"
    exit 1
fi

echo "Stopping local port forwards..."
./scripts/local-port-forwards.sh stop
echo ""

./scripts/k3d-down.sh

echo ""
echo -e "${GREEN}✓ Kubernetes cluster stopped!${NC}"
echo ""
