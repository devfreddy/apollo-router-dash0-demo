#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Quick Restart Script (Apps Only)
# This is the FASTEST restart - only restarts deployments without operator
# Use this when you only changed application code/config, not operator settings
# Time: ~30-60 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Quick Restart - Apps Only (30-60 seconds)                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if we're in the right directory
if [ ! -f "k8s/scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not found in PATH${NC}"
    exit 1
fi

# Check if cluster exists
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Kubernetes cluster not accessible${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Restarting all application deployments...${NC}"
echo ""

# Restart all deployments in apollo-dash0-demo namespace
echo -e "${GREEN}Restarting deployments in apollo-dash0-demo namespace...${NC}"
kubectl rollout restart deployment -n apollo-dash0-demo

echo -e "${GREEN}Waiting for rollout...${NC}"
# Wait for each deployment individually
for deployment in apollo-router accounts products-py reviews inventory; do
    echo -e "  Waiting for $deployment..."
    kubectl rollout status deployment/$deployment -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ QUICK RESTART COMPLETE (~60 seconds)                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Restarted:${NC}"
echo -e "  • Apollo Router"
echo -e "  • Accounts Subgraph"
echo -e "  • Products Subgraph (Python)"
echo -e "  • Reviews Subgraph"
echo -e "  • Inventory Subgraph"
echo ""
echo -e "${YELLOW}Note:${NC} Operator was NOT restarted"
echo -e "  If you changed operator config, use: ${BLUE}./k8s/scripts/restart.sh${NC}"
echo ""
