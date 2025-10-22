#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - k3d Kubernetes Stopper
# Stops the k3d cluster and deployment

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Stopping k3d (Kubernetes) Deployment ===${NC}"
echo ""

# Check if k3d cluster exists
if command -v k3d &> /dev/null && k3d cluster list 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "${YELLOW}Stopping k3d cluster...${NC}"
    ./k8s/scripts/k3d-down.sh
    echo ""
    echo -e "${GREEN}✓ k3d cluster stopped!${NC}"
else
    echo -e "${RED}No k3d cluster found${NC}"
fi

echo ""
