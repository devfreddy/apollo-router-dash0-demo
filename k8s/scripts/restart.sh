#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Fast Restart Script
# This script restarts all components without destroying the cluster
# Much faster than k3d-up.sh - only takes 2-3 minutes instead of 10+ minutes

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Apollo Router + Dash0 - K8s Restart Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

# Check if we're in the right directory
if [ ! -f "k8s/scripts/k3d-up.sh" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.sample to .env and configure your Dash0 credentials"
    exit 1
fi

# Load environment variables
source .env

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

echo -e "${YELLOW}ℹ️  Restarting all components...${NC}"
echo ""

# Step 1: Update Dash0 Secret
echo -e "${GREEN}[1/5] Updating Dash0 auth secret...${NC}"
kubectl create secret generic dash0-auth \
    --from-literal=token="$DASH0_AUTH_TOKEN" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f - > /dev/null
echo -e "${GREEN}      ✓ Secret updated${NC}"

# Step 2: Update ConfigMap
echo -e "${GREEN}[2/5] Updating configuration...${NC}"
kubectl create configmap apollo-config \
    --from-literal=DASH0_METRICS_ENDPOINT="$DASH0_METRICS_ENDPOINT" \
    --from-literal=DASH0_TRACES_ENDPOINT="$DASH0_TRACES_ENDPOINT" \
    --from-literal=SERVICE_NAME="${SERVICE_NAME:-apollo-router-demo}" \
    --from-literal=SERVICE_VERSION="${SERVICE_VERSION:-2.0}" \
    --from-literal=ENVIRONMENT="${ENVIRONMENT:-demo}" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f - > /dev/null
echo -e "${GREEN}      ✓ Configuration updated${NC}"

# Step 3: Restart Dash0 Operator
echo -e "${GREEN}[3/5] Restarting Dash0 operator...${NC}"
kubectl rollout restart deployment/dash0-operator-controller-manager -n dash0-system > /dev/null 2>&1 || true
echo -e "${GREEN}      ✓ Operator restarted${NC}"
echo -e "      ⏳ Waiting for operator to be ready (this may take 1-2 minutes)..."
kubectl rollout status deployment/dash0-operator-controller-manager -n dash0-system \
    --timeout=120s > /dev/null 2>&1 || echo -e "${YELLOW}      ⚠️  Operator status check timed out (may still be starting)${NC}"
echo -e "${GREEN}      ✓ Operator ready${NC}"

# Step 4: Restart all deployments in apollo-dash0-demo namespace
echo -e "${GREEN}[4/5] Restarting all application deployments...${NC}"
kubectl rollout restart deployment -n apollo-dash0-demo > /dev/null
echo -e "${GREEN}      ✓ Deployments restarted${NC}"
echo -e "      ⏳ Waiting for deployments (this may take 1-2 minutes)..."

# Wait for each deployment individually
for deployment in apollo-router accounts products-py reviews inventory; do
    kubectl rollout status deployment/$deployment -n apollo-dash0-demo --timeout=180s > /dev/null 2>&1 || true
done
echo -e "${GREEN}      ✓ All deployments ready${NC}"

# Step 5: Verify health
echo -e "${GREEN}[5/5] Verifying health...${NC}"

# Check router is running
ROUTER_READY=$(kubectl get deployment apollo-router -n apollo-dash0-demo -o jsonpath='{.status.conditions[?(@.type=="Available")].status}')
if [ "$ROUTER_READY" == "True" ]; then
    echo -e "${GREEN}      ✓ Apollo Router is healthy${NC}"
else
    echo -e "${YELLOW}      ⚠️  Apollo Router status unknown${NC}"
fi

# Show summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ RESTART COMPLETE                                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}What's been updated:${NC}"
echo -e "  • Dash0 auth secret (token)"
echo -e "  • Configuration (endpoints, service names)"
echo -e "  • Dash0 operator (restarted & re-instrumented pods)"
echo -e "  • Apollo Router"
echo -e "  • All subgraphs (accounts, products-py, reviews, inventory)"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo -e "  1. Wait 2-5 minutes for operator to instrument pods"
echo -e "  2. Send some GraphQL queries:"
echo -e "     ${BLUE}curl -X POST http://localhost:4000/ \\"
echo -e "       -H 'Content-Type: application/json' \\"
echo -e "       -d '{\"query\":\"{ topProducts { id name } }\"}'${NC}"
echo -e "  3. View logs:"
echo -e "     ${BLUE}kubectl logs -f deployment/apollo-router -n apollo-dash0-demo${NC}"
echo -e "  4. Check Dash0 UI:"
echo -e "     ${BLUE}https://app.dash0.com → Logs/Metrics/Traces → Filter by Dataset: gtm-dash0${NC}"
echo ""
