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
        --agents 1 \
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
    --from-literal=DASH0_METRICS_ENDPOINT="$DASH0_METRICS_ENDPOINT" \
    --from-literal=DASH0_TRACES_ENDPOINT="$DASH0_TRACES_ENDPOINT" \
    --from-literal=SERVICE_NAME="${SERVICE_NAME:-apollo-router-demo}" \
    --from-literal=SERVICE_VERSION="${SERVICE_VERSION:-2.0}" \
    --from-literal=ENVIRONMENT="${ENVIRONMENT:-demo}" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

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

# Install Dash0 operator via Helm (without export config - we'll create it manually)
echo -e "${YELLOW}Installing Dash0 operator...${NC}"
helm upgrade --install dash0-operator \
    dash0-operator/dash0-operator \
    --namespace dash0-system \
    --create-namespace \
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
kubectl wait --for=condition=available --timeout=120s deployment/dash0-operator-controller -n dash0-system || true

# Create Dash0OperatorConfiguration with HTTP export (avoids gRPC auth token blocking issues)
echo -e "${YELLOW}Creating Dash0 operator configuration with HTTP export...${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: operator.dash0.com/v1alpha1
kind: Dash0OperatorConfiguration
metadata:
  name: dash0-operator-configuration
spec:
  export:
    http:
      endpoint: https://ingress.${DASH0_REGION}.aws.dash0.com
      headers:
        - name: Authorization
          value: Bearer ${DASH0_AUTH_TOKEN#Bearer }
      encoding: proto

  kubernetesInfrastructureMetricsCollection:
    enabled: true

  telemetryCollection:
    enabled: true

  selfMonitoring:
    enabled: true

  collectPodLabelsAndAnnotations:
    enabled: true
EOF

echo -e "${GREEN}Dash0 operator configuration created!${NC}"

# Build subgraph images (if not already built)
echo -e "${GREEN}Building subgraph Docker images...${NC}"
for subgraph in accounts products reviews inventory; do
    IMAGE_NAME="apollo-dash0-demo-$subgraph:latest"

    echo -e "${YELLOW}Building $subgraph subgraph...${NC}"
    docker build -t "$IMAGE_NAME" "./subgraphs/$subgraph"

    echo -e "${YELLOW}Importing $IMAGE_NAME to k3d...${NC}"
    k3d image import "$IMAGE_NAME" -c "$CLUSTER_NAME"
done

# Deploy subgraphs
echo -e "${GREEN}Deploying subgraphs...${NC}"
kubectl apply -f k8s/base/subgraphs/ -n apollo-dash0-demo

# Wait for subgraphs to be ready
echo -e "${YELLOW}Waiting for subgraphs to be ready...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment --all -n apollo-dash0-demo

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
    --from-file=supergraph.graphql=router/supergraph.graphql \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap for router configuration
echo -e "${GREEN}Creating router configuration ConfigMap...${NC}"
kubectl create configmap router-config \
    --from-file=router.yaml=router/router.yaml \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Add Apollo Helm repository
echo -e "${GREEN}Adding Apollo Helm repository...${NC}"
helm repo add apollo https://github.com/apollographql/router/raw/dev/helm/chart || true
helm repo update

# Install Apollo Router via Helm
echo -e "${GREEN}Installing Apollo Router via Helm...${NC}"
helm upgrade --install apollo-router \
    oci://ghcr.io/apollographql/helm-charts/router \
    --version 1.57.1 \
    --namespace apollo-dash0-demo \
    --values k8s/helm-values/router-values.yaml \
    --wait

# Wait for router to be ready
echo -e "${YELLOW}Waiting for Apollo Router to be ready...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/apollo-router -n apollo-dash0-demo

# Deploy Dash0 Monitoring Resource
echo -e "${GREEN}Deploying Dash0 Monitoring Resource...${NC}"
kubectl apply -f k8s/base/dash0-monitoring.yaml

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
echo -e "  https://app.dash0.com"
echo ""
echo -e "${GREEN}To tear down:${NC}"
echo -e "  ./k8s/scripts/k3d-down.sh"
