#!/bin/bash
set -e

# Rebuild and redeploy Inventory subgraph
# Use this when you've changed inventory subgraph code/Dockerfile
# Time: ~30-45 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Rebuild & Redeploy Inventory Subgraph                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the kubernetes/ directory${NC}"
    echo "Example: cd kubernetes && ./scripts/rebuild-inventory.sh"
    exit 1
fi

ROOT_DIR="$(cd ".." && pwd)"

# Check dependencies
for cmd in docker k3d kubectl; do
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

IMAGE_NAME="apollo-dash0-demo-inventory:latest"
CONTEXT_DIR="$ROOT_DIR/shared/subgraphs"

echo -e "${GREEN}Building Docker image...${NC}"
if docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/shared/subgraphs/inventory/Dockerfile" "$CONTEXT_DIR"; then
    echo -e "${GREEN}✓ Image built successfully: $IMAGE_NAME${NC}"
else
    echo -e "${RED}Error: Failed to build inventory image${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Importing image to k3d cluster...${NC}"
if k3d image import "$IMAGE_NAME" -c "$CLUSTER_NAME"; then
    echo -e "${GREEN}✓ Image imported successfully${NC}"
else
    echo -e "${RED}Error: Failed to import inventory image${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Restarting inventory deployment...${NC}"
kubectl rollout restart deployment/inventory -n apollo-dash0-demo

echo -e "${GREEN}Waiting for rollout...${NC}"
kubectl rollout status deployment/inventory -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ REBUILD & REDEPLOY COMPLETE                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Built and redeployed:${NC}"
echo -e "  ✓ apollo-dash0-demo-inventory:latest"
echo ""

echo -e "${YELLOW}Quick commands:${NC}"
echo -e "  View logs:         ${BLUE}kubectl logs -f deployment/inventory -n apollo-dash0-demo${NC}"
echo -e "  Pod status:        ${BLUE}kubectl get pods -n apollo-dash0-demo | grep inventory${NC}"
echo ""
