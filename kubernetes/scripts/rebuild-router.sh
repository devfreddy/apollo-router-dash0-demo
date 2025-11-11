#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Rebuild Router Script
# This script rebuilds and redeploys only the Apollo Router deployment
# Use this when you've changed router configuration or code but not subgraphs
# Time: ~20-30 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Rebuild Apollo Router (20-30 seconds)                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if we're in the right directory
if [ ! -f "scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the kubernetes/ directory${NC}"
    echo "Example: cd kubernetes && ./scripts/rebuild-router.sh"
    exit 1
fi

# Get the root directory (one level up from kubernetes/)
ROOT_DIR="$(cd ".." && pwd)"

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
echo -e "${YELLOW}Rebuilding Apollo Router...${NC}"
echo ""

# Update router config from router.yaml
echo -e "${GREEN}Updating router-config ConfigMap from shared/router/router.yaml...${NC}"
kubectl create configmap router-config \
    --from-file=router.yaml="$ROOT_DIR/shared/router/router.yaml" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Also update supergraph schema ConfigMap if it exists
if [ -f "$ROOT_DIR/shared/router/supergraph.graphql" ]; then
    echo -e "${GREEN}Updating supergraph-schema ConfigMap from shared/router/supergraph.graphql...${NC}"
    kubectl create configmap supergraph-schema \
        --from-file=supergraph.graphql="$ROOT_DIR/shared/router/supergraph.graphql" \
        --namespace=apollo-dash0-demo \
        --dry-run=client -o yaml | kubectl apply -f -
fi

# Upgrade Helm release with new values
echo -e "${GREEN}Upgrading Helm release with router-values.yaml...${NC}"
helm upgrade apollo-router oci://ghcr.io/apollographql/helm-charts/router \
    --namespace apollo-dash0-demo \
    --values="$ROOT_DIR/kubernetes/helm-values/router-values.yaml" \
    --wait

# Note: helm upgrade will trigger a pod restart automatically if values changed

echo -e "${GREEN}Router deployment complete and ready${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ ROUTER REBUILD COMPLETE (~30 seconds)                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Rebuilt:${NC}"
echo -e "  • Apollo Router"
echo ""
echo -e "${YELLOW}Note:${NC} Subgraphs and Dash0 operator were NOT restarted"
echo -e "  To rebuild all apps, use: ${BLUE}./kubernetes/scripts/rebuild-apps.sh${NC}"
echo -e "  To restart operator, use: ${BLUE}./kubernetes/scripts/restart-dash0.sh${NC}"
echo ""
