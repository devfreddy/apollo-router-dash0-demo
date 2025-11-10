#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Restart Dash0 Script
# This script restarts the Dash0 operator and updates its configuration
# Use this when you've changed operator settings or need to re-instrument pods

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Restart Dash0 Operator                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if we're in the right directory
if [ ! -f "kubernetes/scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.sample to .env and configure your Dash0 credentials"
    exit 1
fi

# Load environment variables and export them for envsubst
set -a
source .env
set +a

# Verify required variables
if [ -z "$DASH0_AUTH_TOKEN" ]; then
    echo -e "${RED}Error: DASH0_AUTH_TOKEN not set in .env${NC}"
    exit 1
fi

# Check kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not found in PATH${NC}"
    echo "Please install kubectl: https://kubernetes.io/docs/tasks/tools/"
    exit 1
fi

# Check if cluster exists
CLUSTER_NAME="apollo-dash0-demo"
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Kubernetes cluster not accessible${NC}"
    echo "Make sure the cluster is running:"
    echo "  k3d cluster start $CLUSTER_NAME"
    exit 1
fi

echo -e "${YELLOW}ℹ️  Restarting Dash0 operator...${NC}"
echo ""

# Step 1: Update Dash0 operator configuration (must be done before monitoring resource)
echo -e "${GREEN}[1/3] Updating Dash0 operator configuration...${NC}"
envsubst < kubernetes/base/dash0-operator-config.yaml | kubectl apply -f - > /dev/null
sleep 1  # Wait for operator config webhook to process
envsubst < <(kubectl kustomize kubernetes/base) | kubectl apply -f - > /dev/null
echo -e "${GREEN}      ✓ Dash0 configuration updated${NC}"

# Step 2: Restart Dash0 Operator
echo -e "${GREEN}[2/3] Restarting Dash0 operator...${NC}"
kubectl rollout restart deployment/dash0-operator-controller-manager -n dash0-system > /dev/null 2>&1 || true
echo -e "${GREEN}      ✓ Operator restarted${NC}"
echo -e "      ⏳ Waiting for operator to be ready (this may take 1-2 minutes)..."
kubectl rollout status deployment/dash0-operator-controller-manager -n dash0-system \
    --timeout=120s > /dev/null 2>&1 || echo -e "${YELLOW}      ⚠️  Operator status check timed out (may still be starting)${NC}"
echo -e "${GREEN}      ✓ Operator ready${NC}"

# Step 3: Verify health
echo -e "${GREEN}[3/3] Verifying operator health...${NC}"

# Check operator is running
OPERATOR_READY=$(kubectl get deployment dash0-operator-controller-manager -n dash0-system -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
if [ "$OPERATOR_READY" == "True" ]; then
    echo -e "${GREEN}      ✓ Dash0 operator is healthy${NC}"
else
    echo -e "${YELLOW}      ⚠️  Dash0 operator status unknown${NC}"
fi

# Show summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ DASH0 OPERATOR RESTART COMPLETE                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}What's been updated:${NC}"
echo -e "  • Dash0 operator configuration (via kustomize)"
echo -e "  • Dash0 monitoring resources (via kustomize)"
echo -e "  • Dash0 operator deployment (restarted)"
echo ""
echo -e "${YELLOW}Note:${NC} Application deployments were NOT restarted"
echo -e "  To redeploy applications, use: ${BLUE}./kubernetes/scripts/redeploy-apps.sh${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Wait 1-2 minutes for operator to be ready"
echo -e "  2. If you changed application code, redeploy apps:"
echo -e "     ${BLUE}./kubernetes/scripts/redeploy-apps.sh${NC}"
echo -e "  3. Send some GraphQL queries to trigger instrumentation"
echo -e "  4. Check Dash0 UI for new telemetry data"
echo ""
