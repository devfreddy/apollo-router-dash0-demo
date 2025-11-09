#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Upgrade Router Helm Chart Script
# This script upgrades the Apollo Router using Helm
# Use this when you've changed router-values.yaml or need to update Helm values
# Time: ~30-40 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Upgrade Apollo Router Helm Chart (30-40 seconds)         ║${NC}"
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

# Check helm is available
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm not found in PATH${NC}"
    exit 1
fi

# Check if cluster exists
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Kubernetes cluster not accessible${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Upgrading Apollo Router Helm chart...${NC}"
echo ""

# Upgrade router helm chart with new values
echo -e "${GREEN}Upgrading apollo-router in apollo-dash0-demo namespace...${NC}"
helm upgrade apollo-router \
    oci://ghcr.io/apollographql/helm-charts/router \
    --version 2.8.0 \
    --namespace apollo-dash0-demo \
    --values k8s/helm-values/router-values.yaml

# Force pod restart to ensure new values are picked up
echo -e "${GREEN}Restarting apollo-router pods to apply new values...${NC}"
kubectl rollout restart deployment/apollo-router -n apollo-dash0-demo

echo ""
echo -e "${GREEN}Waiting for rollout...${NC}"
echo -e "  Waiting for apollo-router..."
kubectl rollout status deployment/apollo-router -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ ROUTER HELM UPGRADE COMPLETE (~40 seconds)            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Upgraded:${NC}"
echo -e "  • Apollo Router Helm chart with new values"
echo ""
echo -e "${YELLOW}Changes applied:${NC}"
echo -e "  • router-values.yaml changes"
echo -e "  • Telemetry configuration updates"
echo -e "  • Resource limits and probes"
echo ""
echo -e "${YELLOW}Note:${NC} Subgraphs and Dash0 operator were NOT restarted"
echo -e "  To redeploy all apps, use: ${BLUE}./k8s/scripts/redeploy-apps.sh${NC}"
echo -e "  To restart operator, use: ${BLUE}./k8s/scripts/restart-dash0.sh${NC}"
echo ""
