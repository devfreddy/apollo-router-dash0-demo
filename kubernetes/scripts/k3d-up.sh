#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - k3d Setup Script
# This script creates a k3d Kubernetes cluster and deploys the full stack

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Apollo Router + Dash0 k3d Setup ===${NC}"

# Get the root directory (two levels up from this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    echo "Please copy .env.sample to .env and configure your Dash0 credentials"
    exit 1
fi

# Load environment variables and export them for envsubst
set -a
source "$ENV_FILE"
set +a

# Verify required variables
if [ -z "$DASH0_AUTH_TOKEN" ]; then
    echo -e "${RED}Error: DASH0_AUTH_TOKEN not set in .env${NC}"
    exit 1
fi

if [ -z "$DASH0_REGION" ]; then
    echo -e "${RED}Error: DASH0_REGION not set in .env${NC}"
    exit 1
fi

# Check if k3d is installed
if ! command -v k3d &> /dev/null; then
    echo -e "${YELLOW}k3d not found. Installing k3d...${NC}"

    # Detect OS
    OS="$(uname -s)"
    case "$OS" in
        Darwin*)
            if command -v brew &> /dev/null; then
                brew install k3d
            else
                echo -e "${RED}Homebrew not found. Please install Homebrew first: https://brew.sh${NC}"
                exit 1
            fi
            ;;
        Linux*)
            curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
            ;;
        *)
            echo -e "${RED}Unsupported OS: $OS${NC}"
            exit 1
            ;;
    esac
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${YELLOW}kubectl not found. Installing kubectl...${NC}"

    OS="$(uname -s)"
    case "$OS" in
        Darwin*)
            if command -v brew &> /dev/null; then
                brew install kubectl
            else
                echo -e "${RED}Homebrew not found. Please install Homebrew first: https://brew.sh${NC}"
                exit 1
            fi
            ;;
        Linux*)
            curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
            sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
            rm kubectl
            ;;
        *)
            echo -e "${RED}Unsupported OS: $OS${NC}"
            exit 1
            ;;
    esac
fi

# Cluster name
CLUSTER_NAME="apollo-dash0-demo"

# Check if cluster already exists
if k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo -e "${YELLOW}Cluster '$CLUSTER_NAME' already exists.${NC}"
    read -p "Do you want to delete and recreate it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deleting existing cluster...${NC}"
        k3d cluster delete "$CLUSTER_NAME"
    else
        echo -e "${GREEN}Using existing cluster${NC}"
        kubectl config use-context "k3d-$CLUSTER_NAME"
    fi
fi

# Create k3d cluster if it doesn't exist
if ! k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo -e "${GREEN}Creating k3d cluster: $CLUSTER_NAME${NC}"
    k3d cluster create "$CLUSTER_NAME" \
        --api-port 6550 \
        --servers 1 \
        --agents 2 \
        --servers-memory 3G \
        --agents-memory 4G \
        --volume "/tmp/k3d-apollo-storage:/var/lib/rancher/k3s/storage" \
        --port "4000:4000@loadbalancer" \
        --port "8088:8088@loadbalancer" \
        --wait

    echo -e "${GREEN}Cluster created successfully!${NC}"
fi

# Wait for cluster to be ready
echo -e "${YELLOW}Waiting for cluster to be ready...${NC}"
kubectl wait --for=condition=ready node --all --timeout=60s

# Create namespaces
echo -e "${GREEN}Creating namespaces...${NC}"
kubectl create namespace apollo-dash0-demo --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace dash0-system --dry-run=client -o yaml | kubectl apply -f -

# Create Kubernetes secrets
echo -e "${GREEN}Creating Kubernetes secrets...${NC}"
kubectl create secret generic dash0-auth \
    --from-literal=token="$DASH0_AUTH_TOKEN" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Create Dash0 auth secret in dash0-system namespace (for operator)
kubectl create secret generic dash0-auth \
    --from-literal=token="$DASH0_AUTH_TOKEN" \
    --namespace=dash0-system \
    --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap
echo -e "${GREEN}Creating ConfigMap...${NC}"
kubectl create configmap apollo-config \
    --from-literal=DASH0_DATASET="${DASH0_DATASET}" \
    --from-literal=DASH0_METRICS_ENDPOINT="$DASH0_METRICS_ENDPOINT" \
    --from-literal=DASH0_TRACES_ENDPOINT="$DASH0_TRACES_ENDPOINT" \
    --from-literal=SERVICE_NAME="${SERVICE_NAME:-apollo-router-demo}" \
    --from-literal=SERVICE_VERSION="${SERVICE_VERSION:-2.0}" \
    --from-literal=ENVIRONMENT="${ENVIRONMENT:-demo}" \
    --from-literal=ACCOUNTS_SUBGRAPH_ERROR_RATE="${ACCOUNTS_SUBGRAPH_ERROR_RATE:-0}" \
    --from-literal=REVIEWS_SUBGRAPH_ERROR_RATE="${REVIEWS_SUBGRAPH_ERROR_RATE:-0}" \
    --from-literal=PRODUCTS_SUBGRAPH_PY_ERROR_RATE="${PRODUCTS_SUBGRAPH_PY_ERROR_RATE:-0}" \
    --from-literal=INVENTORY_SUBGRAPH_ERROR_RATE="${INVENTORY_SUBGRAPH_ERROR_RATE:-0}" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Install CloudNativePG Operator for PostgreSQL
echo -e "${GREEN}Installing CloudNativePG Operator for PostgreSQL...${NC}"
echo -e "${YELLOW}Adding CloudNativePG Helm repository...${NC}"
helm repo add cnpg https://cloudnative-pg.io/charts 2>/dev/null || true
helm repo update cnpg

echo -e "${YELLOW}Installing CloudNativePG operator...${NC}"
helm upgrade --install cnpg cnpg/cloudnative-pg \
    --namespace cnpg-system \
    --create-namespace \
    --wait \
    --timeout=3m

if [ $? -eq 0 ]; then
    echo -e "${GREEN}CloudNativePG operator installed successfully!${NC}"
else
    echo -e "${YELLOW}Warning: CloudNativePG operator installation had issues, but continuing...${NC}"
fi

# Install Dash0 Kubernetes Operator
echo -e "${GREEN}Installing Dash0 Kubernetes Operator...${NC}"

# Add Dash0 Helm repository
echo -e "${YELLOW}Adding Dash0 Helm repository...${NC}"
helm repo add dash0-operator https://dash0hq.github.io/dash0-operator 2>/dev/null || true
helm repo update dash0-operator

# Prepare operator endpoint (convert HTTP endpoint to gRPC format)
# Extract region from DASH0_REGION
DASH0_OPERATOR_ENDPOINT="ingress.${DASH0_REGION}.aws.dash0.com:4317"
DASH0_API_ENDPOINT="https://api.${DASH0_REGION}.aws.dash0.com"

echo -e "${YELLOW}Dash0 Operator Endpoint: $DASH0_OPERATOR_ENDPOINT${NC}"
echo -e "${YELLOW}Dash0 API Endpoint: $DASH0_API_ENDPOINT${NC}"

# Install Dash0 operator via Helm with secret reference
echo -e "${YELLOW}Installing Dash0 operator...${NC}"
helm upgrade --install dash0-operator \
    dash0-operator/dash0-operator \
    --namespace dash0-system \
    --create-namespace \
    --set operator.dash0Export.enabled=true \
    --set operator.dash0Export.endpoint="${DASH0_OPERATOR_ENDPOINT}" \
    --set operator.dash0Export.secretRef.name=dash0-auth \
    --set operator.dash0Export.secretRef.key=token \
    --set operator.dash0Export.dataset="${DASH0_DATASET}" \
    --set operator.instrumentation.delayAfterEachWorkloadMillis=100 \
    --set operator.instrumentation.delayAfterEachNamespaceMillis=100 \
    --set operator.collectKubernetesInfrastructureMetrics=true \
    --set operator.collectPodLabelsAndAnnotations=true \
    --wait \
    --timeout=3m

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Dash0 operator installed successfully!${NC}"
else
    echo -e "${YELLOW}Warning: Dash0 operator installation had issues, but continuing...${NC}"
fi

# Wait for operator to be ready
echo -e "${YELLOW}Waiting for Dash0 operator to be ready...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/dash0-operator -n dash0-system || true

# Deploy monitoring, database, and subgraph resources using kustomize
echo -e "${YELLOW}Deploying PostgreSQL cluster, monitoring, and subgraph resources with kustomize...${NC}"
kubectl kustomize ../base | kubectl apply -f -
echo -e "${GREEN}Resources deployed!${NC}"

# Wait for PostgreSQL cluster to be ready before deploying subgraphs
echo -e "${YELLOW}Waiting for PostgreSQL cluster to be ready (this may take 1-2 minutes)...${NC}"
kubectl wait --for=condition=ready cluster/inventory-db -n apollo-dash0-demo --timeout=180s || echo -e "${YELLOW}PostgreSQL cluster availability check timing out, but continuing...${NC}"

# Build subgraph images (if not already built)
echo -e "${GREEN}Building subgraph Docker images...${NC}"
for subgraph in accounts products-py reviews inventory; do
    if [ "$subgraph" = "products-py" ]; then
        IMAGE_NAME="apollo-dash0-demo-products-py:latest"
        SUBGRAPH_DIR="products-py"
    else
        IMAGE_NAME="apollo-dash0-demo-$subgraph:latest"
        SUBGRAPH_DIR="$subgraph"
    fi

    echo -e "${YELLOW}Building $subgraph subgraph...${NC}"
    # Build from shared subgraphs directory so Dockerfile can access shared directory
    docker build -t "$IMAGE_NAME" -f "./shared/subgraphs/$SUBGRAPH_DIR/Dockerfile" "./shared/subgraphs"

    echo -e "${YELLOW}Importing $IMAGE_NAME to k3d...${NC}"
    k3d image import "$IMAGE_NAME" -c "$CLUSTER_NAME"
done

# Wait for subgraphs to be ready (already deployed via kustomize)
echo -e "${YELLOW}Waiting for subgraphs to be ready...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/accounts -n apollo-dash0-demo || true
kubectl wait --for=condition=available --timeout=120s deployment/products -n apollo-dash0-demo || true
kubectl wait --for=condition=available --timeout=120s deployment/reviews -n apollo-dash0-demo || true
kubectl wait --for=condition=available --timeout=120s deployment/inventory -n apollo-dash0-demo || true

# Get subgraph service endpoints for supergraph composition
echo -e "${GREEN}Getting subgraph endpoints...${NC}"
ACCOUNTS_URL="http://accounts-service.apollo-dash0-demo.svc.cluster.local:4001/graphql"
PRODUCTS_URL="http://products-service.apollo-dash0-demo.svc.cluster.local:4003/graphql"
REVIEWS_URL="http://reviews-service.apollo-dash0-demo.svc.cluster.local:4002/graphql"
INVENTORY_URL="http://inventory-service.apollo-dash0-demo.svc.cluster.local:4004/graphql"

# Check if supergraph.graphql exists, if not compose it
if [ ! -f router/supergraph.graphql ]; then
    echo -e "${YELLOW}Supergraph schema not found. Please run ./compose-supergraph.sh first${NC}"
    echo -e "${YELLOW}Attempting to compose from running Docker Compose services...${NC}"

    if docker ps | grep -q apollo-dash0-demo-accounts; then
        ./compose-supergraph.sh
    else
        echo -e "${RED}Error: Docker Compose services not running. Cannot compose supergraph.${NC}"
        echo "Please start Docker Compose first: docker compose up -d"
        exit 1
    fi
fi

# Create ConfigMap for supergraph schema
echo -e "${GREEN}Creating supergraph schema ConfigMap...${NC}"
kubectl create configmap supergraph-schema \
    --from-file=supergraph.graphql=shared/router/supergraph.graphql \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap for router configuration
echo -e "${GREEN}Creating router configuration ConfigMap...${NC}"
kubectl create configmap router-config \
    --from-file=router.yaml=shared/router/router.yaml \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Install Apollo Router via Helm
echo -e "${GREEN}Installing Apollo Router via Helm...${NC}"
helm upgrade --install apollo-router \
    oci://ghcr.io/apollographql/helm-charts/router \
    --version 2.8.0 \
    --namespace apollo-dash0-demo \
    --values kubernetes/helm-values/router-values.yaml \
    --wait

# Wait for router to be ready
echo -e "${YELLOW}Waiting for Apollo Router to be ready...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/apollo-router -n apollo-dash0-demo

# Deploy vegeta load generator (after router is ready to avoid DNS lookup failures)
echo -e "${YELLOW}Deploying vegeta load generator...${NC}"
kubectl apply -f kubernetes/base/vegeta.yaml

echo -e "${YELLOW}Dash0 operator will now automatically instrument the workloads...${NC}"
echo -e "${YELLOW}This may take a few moments. Workloads will be restarted if needed.${NC}"

echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo -e "${GREEN}Apollo Router is accessible at:${NC}"
echo -e "  GraphQL API:  ${YELLOW}http://localhost:4000${NC}"
echo -e "  Health Check: ${YELLOW}http://localhost:8088/health${NC}"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo -e "  kubectl get pods -n apollo-dash0-demo"
echo -e "  kubectl get pods -n dash0-system"
echo -e "  kubectl logs -f deployment/apollo-router -n apollo-dash0-demo"
echo -e "  kubectl logs -f deployment/accounts -n apollo-dash0-demo"
echo -e "  kubectl logs -f deployment/dash0-operator-controller-manager -n dash0-system"
echo ""
echo -e "${GREEN}Check Dash0 Monitoring Status:${NC}"
echo -e "  kubectl get dash0monitoring -n apollo-dash0-demo"
echo -e "  kubectl describe dash0monitoring dash0-monitoring-resource -n apollo-dash0-demo"
echo ""
echo -e "${GREEN}Test the GraphQL API:${NC}"
echo -e '  curl -X POST http://localhost:4000/ -H "Content-Type: application/json" -d '"'"'{"query":"{ topProducts { id name price } }"}'"'"''
echo ""
echo -e "${GREEN}View telemetry in Dash0:${NC}"
echo -e "  https://app.dash0.com → Logs/Metrics/Traces → Filter by Dataset: ${DASH0_DATASET:-default}"
echo ""
echo -e "${GREEN}To tear down:${NC}"
echo -e "  ./kubernetes/scripts/k3d-down.sh"
