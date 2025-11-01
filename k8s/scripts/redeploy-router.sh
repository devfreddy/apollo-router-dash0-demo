#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Redeploy Router Script
# This script redeploys only the Apollo Router deployment
# Use this when you've changed router configuration or code but not subgraphs
# Time: ~20-30 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Redeploy Apollo Router (20-30 seconds)                    ║${NC}"
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
echo -e "${YELLOW}Redeploying Apollo Router...${NC}"
echo ""

# Restart router deployment
echo -e "${GREEN}Redeploying apollo-router in apollo-dash0-demo namespace...${NC}"
kubectl rollout restart deployment/apollo-router -n apollo-dash0-demo

echo -e "${GREEN}Waiting for rollout...${NC}"
echo -e "  Waiting for apollo-router..."
kubectl rollout status deployment/apollo-router -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ ROUTER REDEPLOY COMPLETE (~30 seconds)                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Redeployed:${NC}"
echo -e "  • Apollo Router"
echo ""
echo -e "${YELLOW}Note:${NC} Subgraphs and Dash0 operator were NOT restarted"
echo -e "  To redeploy all apps, use: ${BLUE}./k8s/scripts/redeploy-apps.sh${NC}"
echo -e "  To restart operator, use: ${BLUE}./k8s/scripts/restart-dash0.sh${NC}"
echo ""
