#!/bin/bash
set -e

# Rebuild and redeploy Willful Waste Website
# Use this when you've changed website code/Dockerfile
# Time: ~30-45 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Rebuild & Redeploy Willful Waste Website                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the kubernetes/ directory${NC}"
    echo "Example: cd kubernetes && ./scripts/rebuild-website.sh"
    exit 1
fi

ROOT_DIR="$(cd ".." && pwd)"

# Load environment variables from .env file if it exists
if [ -f "$ROOT_DIR/.env" ]; then
    # Load .env but only VITE_* and DASH0_* variables
    export $(grep -E '^VITE_|^DASH0_|^ENVIRONMENT=' "$ROOT_DIR/.env" | xargs)
fi

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

IMAGE_NAME="apollo-dash0-demo-willful-waste-website:latest"
SERVICE_DIR="website"

# Debug: Show what we're building with
echo -e "${YELLOW}Build Configuration:${NC}"
echo "  VITE_DASH0_ENDPOINT=${VITE_DASH0_ENDPOINT}"
echo "  VITE_DASH0_AUTH_TOKEN=${VITE_DASH0_AUTH_TOKEN:0:10}..."
echo "  VITE_DASH0_DATASET=${VITE_DASH0_DATASET}"
echo "  VITE_ENVIRONMENT=${ENVIRONMENT:-demo}"
echo ""

echo -e "${GREEN}Building Docker image...${NC}"
docker build \
    --no-cache \
    --build-arg VITE_DASH0_ENDPOINT="${VITE_DASH0_ENDPOINT}" \
    --build-arg VITE_DASH0_AUTH_TOKEN="${VITE_DASH0_AUTH_TOKEN}" \
    --build-arg VITE_DASH0_DATASET="${VITE_DASH0_DATASET}" \
    --build-arg VITE_ENVIRONMENT="${ENVIRONMENT:-demo}" \
    --build-arg VITE_GRAPHQL_URL="http://router.localhost/graphql" \
    -t "$IMAGE_NAME" \
    -f "$ROOT_DIR/shared/$SERVICE_DIR/Dockerfile" \
    "$ROOT_DIR/shared/$SERVICE_DIR" || {
    echo -e "${RED}Error: Failed to build website image${NC}"
    exit 1
}

echo -e "${GREEN}✓ Image built successfully: $IMAGE_NAME${NC}"

echo ""
echo -e "${GREEN}Importing image to k3d cluster...${NC}"
if k3d image import "$IMAGE_NAME" -c "$CLUSTER_NAME"; then
    echo -e "${GREEN}✓ Image imported successfully${NC}"
else
    echo -e "${RED}Error: Failed to import website image${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Restarting willful-waste-website deployment...${NC}"
kubectl rollout restart deployment/willful-waste-website -n apollo-dash0-demo

echo -e "${GREEN}Waiting for rollout...${NC}"
kubectl rollout status deployment/willful-waste-website -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ REBUILD & REDEPLOY COMPLETE                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Built and redeployed:${NC}"
echo -e "  ✓ apollo-dash0-demo-willful-waste-website:latest"
echo ""

echo -e "${YELLOW}Quick commands:${NC}"
echo -e "  View logs:         ${BLUE}kubectl logs -f deployment/willful-waste-website -n apollo-dash0-demo${NC}"
echo -e "  Pod status:        ${BLUE}kubectl get pods -n apollo-dash0-demo | grep willful-waste${NC}"
echo ""
