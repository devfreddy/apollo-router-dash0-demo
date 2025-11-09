#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Rebuild and Reimport Docker Images
# This script rebuilds all subgraph Docker images and reimports them into k3d
# Use this when you've changed subgraph code (Dockerfile or source files)
# The cluster stays up - pods will auto-restart with new images
# Time: ~2-3 minutes (depending on code changes and build time)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Rebuild & Reimport Docker Images (2-3 minutes)            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "k8s/scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker not found in PATH${NC}"
    exit 1
fi

# Check if k3d is available
if ! command -v k3d &> /dev/null; then
    echo -e "${RED}Error: k3d not found in PATH${NC}"
    exit 1
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not found in PATH${NC}"
    exit 1
fi

# Check if cluster exists
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Kubernetes cluster not accessible${NC}"
    echo -e "${YELLOW}Did you run ./k8s/scripts/k3d-up.sh first?${NC}"
    exit 1
fi

# Get cluster name from kubeconfig context
CLUSTER_NAME=$(kubectl config current-context | sed 's/k3d-//')

if ! k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo -e "${RED}Error: k3d cluster '$CLUSTER_NAME' not found${NC}"
    exit 1
fi

echo -e "${YELLOW}Cluster: $CLUSTER_NAME${NC}"
echo ""

# Build and import each subgraph image
SUBGRAPHS=("accounts" "products" "reviews" "inventory")

for subgraph in "${SUBGRAPHS[@]}"; do
    IMAGE_NAME="apollo-dash0-demo-$subgraph:latest"

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}[$subgraph]${NC} Building Docker image..."

    # Build from subgraphs directory so Dockerfile can access shared directory
    if docker build -t "$IMAGE_NAME" -f "./subgraphs/$subgraph/Dockerfile" "./subgraphs"; then
        echo -e "${GREEN}[$subgraph]${NC} Image built successfully: $IMAGE_NAME"
    else
        echo -e "${RED}Error: Failed to build $subgraph image${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}[$subgraph]${NC} Importing image to k3d cluster..."

    if k3d image import "$IMAGE_NAME" -c "$CLUSTER_NAME"; then
        echo -e "${GREEN}[$subgraph]${NC} Image imported successfully"
    else
        echo -e "${RED}Error: Failed to import $subgraph image${NC}"
        exit 1
    fi

    echo ""
done

echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Restarting subgraph deployments to use new images...${NC}"
echo ""

# Restart subgraph deployments (they'll automatically use the new images)
for subgraph in "${SUBGRAPHS[@]}"; do
    echo -e "${GREEN}[$subgraph]${NC} Restarting deployment..."
    kubectl rollout restart deployment/"$subgraph" -n apollo-dash0-demo
done

echo ""
echo -e "${YELLOW}Waiting for rollout...${NC}"
for subgraph in "${SUBGRAPHS[@]}"; do
    echo -e "${GREEN}[$subgraph]${NC} Waiting for deployment to be ready..."
    kubectl rollout status deployment/"$subgraph" -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ REBUILD & REIMPORT COMPLETE                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Rebuilt and reimported images:${NC}"
for subgraph in "${SUBGRAPHS[@]}"; do
    echo -e "  ✓ apollo-dash0-demo-$subgraph:latest"
done

echo ""
echo -e "${GREEN}Restarted deployments:${NC}"
for subgraph in "${SUBGRAPHS[@]}"; do
    echo -e "  ✓ $subgraph"
done

echo ""
echo -e "${YELLOW}Quick commands:${NC}"
echo -e "  Check pod status:  ${BLUE}kubectl get pods -n apollo-dash0-demo${NC}"
echo -e "  View subgraph logs: ${BLUE}kubectl logs -f deployment/accounts -n apollo-dash0-demo${NC}"
echo -e "  Test GraphQL:       ${BLUE}curl -X POST http://localhost:4000/ -H 'Content-Type: application/json' -d '{\"query\":\"{ __typename }\"}' ${NC}"
echo ""
