#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Update ConfigMap Script
# This script updates the apollo-config ConfigMap with environment variables from .env
# Use this when you only need to update configuration without restarting anything
# Time: ~5-10 seconds

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Update ConfigMap                                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if we're in the right directory
if [ ! -f "scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the kubernetes/ directory${NC}"
    echo "Example: cd kubernetes && ./scripts/update-configmap.sh"
    exit 1
fi

# Get the root directory (one level up from kubernetes/)
ROOT_DIR="$(cd ".." && pwd)"

# Check if .env exists
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.sample to .env and configure your settings"
    exit 1
fi

# Load environment variables and export them for envsubst
set -a
source "$ROOT_DIR/.env"
set +a

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not found in PATH${NC}"
    echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if cluster exists
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Kubernetes cluster not accessible${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Updating ConfigMap from .env...${NC}"
echo ""

# Update ConfigMap
echo -e "${GREEN}Updating apollo-config ConfigMap...${NC}"
kubectl create configmap apollo-config \
    --from-literal=DASH0_DATASET="$DASH0_DATASET" \
    --from-literal=DASH0_METRICS_ENDPOINT="$DASH0_METRICS_ENDPOINT" \
    --from-literal=DASH0_TRACES_ENDPOINT="$DASH0_TRACES_ENDPOINT" \
    --from-literal=SERVICE_NAME="${SERVICE_NAME:-apollo-router-demo}" \
    --from-literal=SERVICE_VERSION="${SERVICE_VERSION:-2.0}" \
    --from-literal=ENVIRONMENT="${ENVIRONMENT:-demo}" \
    --from-literal=LOCUST_USERS="${LOCUST_USERS:-5}" \
    --from-literal=LOCUST_SPAWN_RATE="${LOCUST_SPAWN_RATE:-1}" \
    --from-literal=LOCUST_RUN_TIME="${LOCUST_RUN_TIME:-}" \
    --from-literal=ACCOUNTS_SUBGRAPH_ERROR_RATE="${ACCOUNTS_SUBGRAPH_ERROR_RATE:-1}" \
    --from-literal=REVIEWS_SUBGRAPH_ERROR_RATE="${REVIEWS_SUBGRAPH_ERROR_RATE:-1}" \
    --from-literal=PRODUCTS_SUBGRAPH_ERROR_RATE="${PRODUCTS_SUBGRAPH_ERROR_RATE:-1}" \
    --from-literal=PRODUCTS_SUBGRAPH_PY_ERROR_RATE="${PRODUCTS_SUBGRAPH_PY_ERROR_RATE:-1}" \
    --from-literal=INVENTORY_SUBGRAPH_ERROR_RATE="${INVENTORY_SUBGRAPH_ERROR_RATE:-1}" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f - > /dev/null
echo -e "${GREEN}      ✓ ConfigMap updated${NC}"

# Show summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ CONFIGMAP UPDATE COMPLETE                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Updated ConfigMap keys:${NC}"
echo -e "  • DASH0_DATASET"
echo -e "  • DASH0_METRICS_ENDPOINT"
echo -e "  • DASH0_TRACES_ENDPOINT"
echo -e "  • SERVICE_NAME"
echo -e "  • SERVICE_VERSION"
echo -e "  • ENVIRONMENT"
echo -e "  • LOCUST_USERS"
echo -e "  • LOCUST_SPAWN_RATE"
echo -e "  • LOCUST_RUN_TIME"
echo -e "  • ACCOUNTS_SUBGRAPH_ERROR_RATE"
echo -e "  • REVIEWS_SUBGRAPH_ERROR_RATE"
echo -e "  • PRODUCTS_SUBGRAPH_ERROR_RATE"
echo -e "  • PRODUCTS_SUBGRAPH_PY_ERROR_RATE"
echo -e "  • INVENTORY_SUBGRAPH_ERROR_RATE"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Rebuild applications to use new config:"
echo -e "     ${BLUE}./kubernetes/scripts/rebuild-apps.sh${NC}"
echo -e "  2. Or rebuild just the router:"
echo -e "     ${BLUE}./kubernetes/scripts/rebuild-router.sh${NC}"
echo -e "  3. Or view the ConfigMap:"
echo -e "     ${BLUE}kubectl get configmap apollo-config -n apollo-dash0-demo -o yaml${NC}"
echo ""
