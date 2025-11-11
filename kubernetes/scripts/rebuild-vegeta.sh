#!/bin/bash
set -e

# Rebuild and redeploy Vegeta load generator
# Use this when you've updated vegeta configuration
# Time: ~10-15 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Rebuild & Redeploy Vegeta Load Generator                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the kubernetes/ directory${NC}"
    echo "Example: cd kubernetes && ./scripts/rebuild-vegeta.sh"
    exit 1
fi

ROOT_DIR="$(cd ".." && pwd)"

# Check dependencies
for cmd in kubectl; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}Error: $cmd not found in PATH${NC}"
        exit 1
    fi
done

# Check if cluster exists
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Kubernetes cluster not accessible${NC}"
    exit 1
fi

CLUSTER_NAME=$(kubectl config current-context | sed 's/k3d-//')

echo -e "${YELLOW}Cluster: $CLUSTER_NAME${NC}"
echo ""

echo -e "${GREEN}Updating vegeta ConfigMap from base manifests...${NC}"
if kubectl apply -f "$ROOT_DIR/kubernetes/base/vegeta.yaml" -n apollo-dash0-demo > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ConfigMap updated successfully${NC}"
else
    echo -e "${RED}Error: Failed to update vegeta ConfigMap${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Restarting vegeta deployment...${NC}"
kubectl rollout restart deployment/vegeta -n apollo-dash0-demo

echo -e "${GREEN}Waiting for rollout...${NC}"
kubectl rollout status deployment/vegeta -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ REBUILD & REDEPLOY COMPLETE                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Redeployed:${NC}"
echo -e "  ✓ vegeta deployment with updated configuration"
echo ""

echo -e "${YELLOW}Quick commands:${NC}"
echo -e "  View logs:         ${BLUE}kubectl logs -f deployment/vegeta -n apollo-dash0-demo${NC}"
echo -e "  Pod status:        ${BLUE}kubectl get pods -n apollo-dash0-demo | grep vegeta${NC}"
echo ""
