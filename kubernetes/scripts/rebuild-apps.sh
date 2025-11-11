#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Rebuild Applications Script
# This script rebuilds and redeploys all application deployments (router + subgraphs)
# Use this when you've changed application code/config but not operator settings
# Time: ~30-60 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Rebuild Applications (30-60 seconds)                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if we're in the right directory
if [ ! -f "scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the kubernetes/ directory${NC}"
    echo "Example: cd kubernetes && ./scripts/rebuild-apps.sh"
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
echo -e "${YELLOW}Rebuilding all application deployments...${NC}"
echo ""

# First, apply manifests to pick up any ConfigMap changes
echo -e "${GREEN}Applying manifests...${NC}"
kubectl apply -k base/ -n apollo-dash0-demo > /dev/null 2>&1
echo -e "  ✓ Manifests applied"
echo ""

# Restart all application deployments explicitly
echo -e "${GREEN}Rebuilding all applications in apollo-dash0-demo namespace...${NC}"
for deployment in apollo-router accounts products reviews inventory vegeta willful-waste-website willful-waste-bot; do
    echo -e "  Restarting $deployment..."
    kubectl rollout restart deployment/"$deployment" -n apollo-dash0-demo || true
done

echo ""
echo -e "${GREEN}Waiting for rollout...${NC}"
# Wait for each deployment individually
for deployment in apollo-router accounts products reviews inventory vegeta willful-waste-website willful-waste-bot; do
    echo -e "  Waiting for $deployment..."
    kubectl rollout status deployment/"$deployment" -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ REBUILD COMPLETE (~60 seconds)                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Rebuilt:${NC}"
echo -e "  • Apollo Router"
echo -e "  • Accounts Subgraph"
echo -e "  • Products Subgraph (Python)"
echo -e "  • Reviews Subgraph"
echo -e "  • Inventory Subgraph"
echo -e "  • Vegeta Load Generator"
echo -e "  • Willful Waste Website"
echo -e "  • Willful Waste Bot"
echo ""
echo -e "${YELLOW}Notes:${NC}"
echo -e "  • PostgreSQL cluster was NOT redeployed (persistent data retained)"
echo -e "  • Dash0 operator was NOT restarted"
echo -e "  If you changed operator config, use: ${BLUE}./kubernetes/scripts/restart-dash0.sh${NC}"
echo ""
