#!/bin/bash
# Rebuild and deploy Locust-based load testing bot to Kubernetes
# Usage: ./kubernetes/scripts/rebuild-locust.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NAMESPACE="apollo-dash0-demo"
BOT_DEPLOYMENT="willful-waste-bot"
BOT_IMAGE="apollo-dash0-demo-willful-waste-bot:latest"
K3D_CLUSTER="apollo-dash0-demo"

echo "=== Rebuilding Locust Load Testing Bot ==="
echo "Project root: $PROJECT_ROOT"
echo "Namespace: $NAMESPACE"
echo "Deployment: $BOT_DEPLOYMENT"
echo "Image: $BOT_IMAGE"
echo ""

# Verify k3d cluster exists
if ! k3d cluster list | grep -q "$K3D_CLUSTER"; then
    echo "❌ k3d cluster '$K3D_CLUSTER' not found"
    echo "Start the cluster with: ./kubernetes/scripts/k3d-up.sh"
    exit 1
fi

# Verify Dockerfile and locustfile.py exist
if [ ! -f "$PROJECT_ROOT/shared/website-bot/Dockerfile" ]; then
    echo "❌ Dockerfile not found at: $PROJECT_ROOT/shared/website-bot/Dockerfile"
    exit 1
fi

if [ ! -f "$PROJECT_ROOT/shared/website-bot/locustfile.py" ]; then
    echo "❌ locustfile.py not found at: $PROJECT_ROOT/shared/website-bot/locustfile.py"
    exit 1
fi

# Build Docker image
echo "Building Docker image: $BOT_IMAGE"
cd "$PROJECT_ROOT"
DOCKER_BUILDKIT=1 docker build \
    -t "$BOT_IMAGE" \
    -f "shared/website-bot/Dockerfile" \
    "shared/website-bot/" \
    2>&1 | tail -20  # Show last 20 lines of build output

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✓ Docker image built successfully"
echo ""

# Import image to k3d
echo "Importing image to k3d cluster..."
k3d image import "$BOT_IMAGE" -c "$K3D_CLUSTER"

if [ $? -ne 0 ]; then
    echo "❌ Failed to import image to k3d cluster"
    exit 1
fi

echo "✓ Image imported to k3d cluster"
echo ""

# Check if bot deployment exists
if kubectl get deployment "$BOT_DEPLOYMENT" -n "$NAMESPACE" &>/dev/null; then
    echo "Restarting existing bot deployment..."
    kubectl rollout restart deployment/"$BOT_DEPLOYMENT" -n "$NAMESPACE"
    kubectl rollout status deployment/"$BOT_DEPLOYMENT" -n "$NAMESPACE" --timeout=60s
else
    echo "Applying bot deployment..."
    kubectl apply -f "$PROJECT_ROOT/kubernetes/base/website-bot.yaml"
    kubectl rollout status deployment/"$BOT_DEPLOYMENT" -n "$NAMESPACE" --timeout=60s
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy bot"
    exit 1
fi

echo "✓ Bot deployment successful"
echo ""

# Show bot status
echo "=== Bot Status ==="
kubectl get deployment "$BOT_DEPLOYMENT" -n "$NAMESPACE"
echo ""
echo "Pod status:"
kubectl get pods -l "app=$BOT_DEPLOYMENT" -n "$NAMESPACE"
echo ""

# Show recent logs
echo "=== Recent Bot Logs ==="
POD=$(kubectl get pods -l "app=$BOT_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [ -n "$POD" ]; then
    echo "Showing logs from: $POD"
    kubectl logs "$POD" -n "$NAMESPACE" --tail=20 || true
else
    echo "Waiting for pod to be ready..."
    sleep 3
    POD=$(kubectl get pods -l "app=$BOT_DEPLOYMENT" -n "$NAMESPACE" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
    if [ -n "$POD" ]; then
        kubectl logs "$POD" -n "$NAMESPACE" --tail=20 || true
    fi
fi

echo ""
echo "=== Locust Bot Deployment Complete ==="
echo "Access Locust web UI:"
echo "  kubectl port-forward -n $NAMESPACE svc/$BOT_DEPLOYMENT 8089:8089"
echo "  Then open: http://localhost:8089"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/$BOT_DEPLOYMENT -n $NAMESPACE"
