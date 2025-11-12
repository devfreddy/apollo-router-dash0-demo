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
if [ ! -f "scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the kubernetes/ directory${NC}"
    echo "Example: cd kubernetes && ./scripts/rebuild-and-reimport-images.sh"
    exit 1
fi

# Get the root directory (one level up from kubernetes/)
ROOT_DIR="$(cd ".." && pwd)"

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
    echo -e "${YELLOW}Did you run ./kubernetes/scripts/k3d-up.sh first?${NC}"
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

# Load environment variables from .env file if it exists
if [ -f "$ROOT_DIR/.env" ]; then
    # Load .env but only VITE_* and DASH0_* variables
    export $(grep -E '^VITE_|^DASH0_|^ENVIRONMENT=' "$ROOT_DIR/.env" | xargs)
fi

# Function to build subgraph image
build_subgraph() {
    local subgraph=$1
    local cluster_name=$2

    if [ "$subgraph" = "products" ]; then
        IMAGE_NAME="apollo-dash0-demo-products:latest"
        SUBGRAPH_DIR="products"
        CONTEXT_DIR="$ROOT_DIR/shared/subgraphs/$SUBGRAPH_DIR"
    else
        IMAGE_NAME="apollo-dash0-demo-$subgraph:latest"
        SUBGRAPH_DIR="$subgraph"
        CONTEXT_DIR="$ROOT_DIR/shared/subgraphs"
    fi

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}[$subgraph]${NC} Building Docker image..."

    # Build from subgraphs directory so Dockerfile can access shared directory
    if docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/shared/subgraphs/$SUBGRAPH_DIR/Dockerfile" "$CONTEXT_DIR"; then
        echo -e "${GREEN}[$subgraph]${NC} Image built successfully: $IMAGE_NAME"
    else
        echo -e "${RED}Error: Failed to build $subgraph image${NC}"
        return 1
    fi

    echo ""
    echo -e "${GREEN}[$subgraph]${NC} Importing image to k3d cluster..."

    if k3d image import "$IMAGE_NAME" -c "$cluster_name"; then
        echo -e "${GREEN}[$subgraph]${NC} Image imported successfully"
    else
        echo -e "${RED}Error: Failed to import $subgraph image${NC}"
        return 1
    fi

    echo ""
}

# Function to build website service image
build_website_service() {
    local service=$1
    local cluster_name=$2

    if [ "$service" = "website" ]; then
        IMAGE_NAME="apollo-dash0-demo-willful-waste-website:latest"
        SERVICE_DIR="website"
    else
        IMAGE_NAME="apollo-dash0-demo-willful-waste-bot:latest"
        SERVICE_DIR="website-bot"
    fi

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}[$service]${NC} Building Docker image..."

    if [ "$service" = "website" ]; then
        # Pass Dash0 RUM configuration as build args for the website (if available)
        docker build \
            --build-arg VITE_DASH0_ENDPOINT="${VITE_DASH0_ENDPOINT}" \
            --build-arg VITE_DASH0_AUTH_TOKEN="${VITE_DASH0_AUTH_TOKEN:-}" \
            --build-arg VITE_DASH0_DATASET="${VITE_DASH0_DATASET:-}" \
            --build-arg VITE_ENVIRONMENT="${ENVIRONMENT:-demo}" \
            --build-arg VITE_GRAPHQL_URL="http://router.localhost/graphql" \
            -t "$IMAGE_NAME" \
            -f "$ROOT_DIR/shared/$SERVICE_DIR/Dockerfile" \
            "$ROOT_DIR/shared/$SERVICE_DIR" || return 1
    else
        docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/shared/$SERVICE_DIR/Dockerfile" "$ROOT_DIR/shared/$SERVICE_DIR" || return 1
    fi
    echo -e "${GREEN}[$service]${NC} Image built successfully: $IMAGE_NAME"

    echo ""
    echo -e "${GREEN}[$service]${NC} Importing image to k3d cluster..."

    if k3d image import "$IMAGE_NAME" -c "$cluster_name"; then
        echo -e "${GREEN}[$service]${NC} Image imported successfully"
    else
        echo -e "${RED}Error: Failed to import $service image${NC}"
        return 1
    fi

    echo ""
}

# Build and import each subgraph image
SUBGRAPHS=("accounts" "products" "reviews" "inventory")

for subgraph in "${SUBGRAPHS[@]}"; do
    if ! build_subgraph "$subgraph" "$CLUSTER_NAME"; then
        exit 1
    fi
done

# Build and import website services
SERVICES=("website" "bot")

for service in "${SERVICES[@]}"; do
    if ! build_website_service "$service" "$CLUSTER_NAME"; then
        exit 1
    fi
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

# Restart website service deployments
WEBSITE_DEPLOYMENTS=("willful-waste-website" "willful-waste-bot")
for deployment in "${WEBSITE_DEPLOYMENTS[@]}"; do
    echo -e "${GREEN}[$deployment]${NC} Restarting deployment..."
    kubectl rollout restart deployment/"$deployment" -n apollo-dash0-demo || true
done

echo ""
echo -e "${YELLOW}Waiting for rollout...${NC}"
for subgraph in "${SUBGRAPHS[@]}"; do
    echo -e "${GREEN}[$subgraph]${NC} Waiting for deployment to be ready..."
    kubectl rollout status deployment/"$subgraph" -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true
done

# Wait for website services (they may not exist, so use || true)
for deployment in "${WEBSITE_DEPLOYMENTS[@]}"; do
    echo -e "${GREEN}[$deployment]${NC} Waiting for deployment to be ready..."
    kubectl rollout status deployment/"$deployment" -n apollo-dash0-demo --timeout=120s > /dev/null 2>&1 || true
done

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ REBUILD & REIMPORT COMPLETE                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}Rebuilt and reimported images:${NC}"
for subgraph in "${SUBGRAPHS[@]}"; do
    if [ "$subgraph" = "products" ]; then
        echo -e "  ✓ apollo-dash0-demo-products:latest"
    else
        echo -e "  ✓ apollo-dash0-demo-$subgraph:latest"
    fi
done
echo -e "  ✓ apollo-dash0-demo-willful-waste-website:latest"
echo -e "  ✓ apollo-dash0-demo-willful-waste-bot:latest"

echo ""
echo -e "${GREEN}Restarted deployments:${NC}"
for subgraph in "${SUBGRAPHS[@]}"; do
    echo -e "  ✓ $subgraph"
done
echo -e "  ✓ willful-waste-website"
echo -e "  ✓ willful-waste-bot"

echo ""
echo -e "${YELLOW}Quick commands:${NC}"
echo -e "  Check pod status:  ${BLUE}kubectl get pods -n apollo-dash0-demo${NC}"
echo -e "  View subgraph logs: ${BLUE}kubectl logs -f deployment/accounts -n apollo-dash0-demo${NC}"
echo -e "  Test GraphQL:       ${BLUE}curl -X POST http://localhost:4000/ -H 'Content-Type: application/json' -d '{\"query\":\"{ __typename }\"}' ${NC}"
echo ""
