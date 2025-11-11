#!/bin/bash
# Rebuild PostgreSQL Prometheus Exporter
# Rebuilds and redeploys the postgres-exporter deployment in Kubernetes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "Rebuilding postgres-exporter..."

# Apply the postgres-exporter manifest
kubectl apply -f "${PROJECT_ROOT}/kubernetes/base/postgres-exporter.yaml"

# Force a rollout restart to pull the new image
kubectl rollout restart deployment/postgres-exporter -n apollo-dash0-demo

# Wait for the rollout to complete
echo "Waiting for postgres-exporter to be ready..."
kubectl rollout status deployment/postgres-exporter -n apollo-dash0-demo

echo "✓ postgres-exporter rebuilt successfully"
