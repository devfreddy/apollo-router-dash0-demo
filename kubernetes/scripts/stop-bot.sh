#!/bin/bash
# Stop and remove the willful-waste-bot deployment from Kubernetes
# Usage: ./kubernetes/scripts/stop-bot.sh

set -e

NAMESPACE="apollo-dash0-demo"
BOT_DEPLOYMENT="willful-waste-bot"

echo "Stopping bot deployment..."
echo "Namespace: $NAMESPACE"
echo "Deployment: $BOT_DEPLOYMENT"
echo ""

# Check if deployment exists
if ! kubectl get deployment "$BOT_DEPLOYMENT" -n "$NAMESPACE" &>/dev/null; then
    echo "✓ Bot deployment not found (already removed or not deployed)"
    exit 0
fi

# Delete the deployment
echo "Deleting deployment..."
kubectl delete deployment "$BOT_DEPLOYMENT" -n "$NAMESPACE"

# Wait for pods to terminate
echo "Waiting for pods to terminate..."
kubectl wait --for=delete pod -l app="$BOT_DEPLOYMENT" -n "$NAMESPACE" --timeout=30s 2>/dev/null || true

# Verify removal
if kubectl get deployment "$BOT_DEPLOYMENT" -n "$NAMESPACE" &>/dev/null; then
    echo "❌ Failed to remove bot deployment"
    exit 1
else
    echo "✓ Bot deployment successfully removed"
fi

echo ""
echo "Bot removal complete. You can now deploy Locust with rebuild-locust.sh"
