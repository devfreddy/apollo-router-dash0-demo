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
if [ ! -f "kubernetes/scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.sample to .env and configure your settings"
    exit 1
fi

# Load environment variables and export them for envsubst
set -a
source .env
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
    --from-literal=DASH0_METRICS_ENDPOINT="$DASH0_METRICS_ENDPOINT" \
    --from-literal=DASH0_TRACES_ENDPOINT="$DASH0_TRACES_ENDPOINT" \
    --from-literal=SERVICE_NAME="${SERVICE_NAME:-apollo-router-demo}" \
    --from-literal=SERVICE_VERSION="${SERVICE_VERSION:-2.0}" \
    --from-literal=ENVIRONMENT="${ENVIRONMENT:-demo}" \
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
echo -e "  • DASH0_METRICS_ENDPOINT"
echo -e "  • DASH0_TRACES_ENDPOINT"
echo -e "  • SERVICE_NAME"
echo -e "  • SERVICE_VERSION"
echo -e "  • ENVIRONMENT"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Redeploy applications to use new config:"
echo -e "     ${BLUE}./kubernetes/scripts/redeploy-apps.sh${NC}"
echo -e "  2. Or redeploy just the router:"
echo -e "     ${BLUE}./kubernetes/scripts/redeploy-router.sh${NC}"
echo -e "  3. Or view the ConfigMap:"
echo -e "     ${BLUE}kubectl get configmap apollo-config -n apollo-dash0-demo -o yaml${NC}"
echo ""
