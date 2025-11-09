# Kubernetes Deployment with k3d

This directory contains all the resources needed to deploy the Apollo Router + Dash0 demo on Kubernetes using k3d.

## Overview

The k3d deployment uses:
- **k3d**: Lightweight Kubernetes cluster running in Docker
- **Dash0 Kubernetes Operator**: Automatic instrumentation and enhanced observability ⭐ NEW!
- **Apollo Router Helm Chart**: Official Helm chart from Apollo GraphQL
- **Custom Subgraph Deployments**: Kubernetes manifests for the four subgraphs
- **ConfigMaps & Secrets**: For configuration and credentials

**See [DASH0-OPERATOR.md](DASH0-OPERATOR.md) for detailed operator documentation.**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              k3d Cluster                                │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  Namespace: dash0-system                       │   │
│  │                                                 │   │
│  │  ┌──────────────────────┐                      │   │
│  │  │  Dash0 Operator      │                      │   │
│  │  │  - Auto-instrumentation                     │   │
│  │  │  - OTel Collectors   │                      │   │
│  │  └──────────────────────┘                      │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │  Namespace: apollo-dash0-demo                  │   │
│  │                                                 │   │
│  │  ┌──────────────────────┐                      │   │
│  │  │  Apollo Router       │                      │   │
│  │  │  (Helm Chart)        │                      │   │
│  │  │  Port: 4000          │◄─────────────────────┼─── LoadBalancer
│  │  └─────┬────────────────┘                      │   │
│  │        │                                        │   │
│  │        ├───► Instrumented Subgraphs:           │   │
│  │        │     - accounts:4001   (Node.js)       │   │
│  │        │     - products:4003   (Node.js)       │   │
│  │        │     - reviews:4002    (Node.js)       │   │
│  │        │     - inventory:4004  (Node.js)       │   │
│  │        │                                        │   │
│  │        └───► Dash0 Operator ───► Dash0 Cloud   │   │
│  │              - Metrics                          │   │
│  │              - Traces                           │   │
│  │              - Logs                             │   │
│  │              - K8s Metrics                      │   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker (or Colima on macOS)
- kubectl (will be auto-installed if missing)
- Helm 3 (should already be installed)
- k3d (will be auto-installed if missing)
- Dash0 account with API token

## Quick Start

### 1. Ensure .env is configured

Make sure your `.env` file has the required Dash0 credentials:
```bash
DASH0_AUTH_TOKEN="Bearer auth_xxxxx"
DASH0_REGION=us-west-2
```

### 2. Deploy to k3d

```bash
./k8s/scripts/k3d-up.sh
```

This script will:
1. Install k3d and kubectl if not present
2. Create a k3d cluster named `apollo-dash0-demo`
3. Create namespace, secrets, and configmaps
4. Build and import subgraph Docker images
5. Deploy all subgraphs
6. Compose the supergraph schema
7. Deploy Apollo Router via Helm
8. Expose the router on `localhost:4000`

### 3. Test the deployment

```bash
# Check all pods are running
kubectl get pods -n apollo-dash0-demo

# Test the GraphQL API
curl -X POST http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ topProducts { id name price } }"}'
```

### 4. Tear down

```bash
./k8s/scripts/k3d-down.sh
```

## Directory Structure

```
k8s/
├── README.md                    # This file
├── base/
│   └── subgraphs/              # Kubernetes manifests for subgraphs
│       ├── accounts.yaml
│       ├── products.yaml
│       ├── reviews.yaml
│       └── inventory.yaml
├── helm-values/
│   └── router-values.yaml      # Helm values for Apollo Router
└── scripts/
    ├── k3d-up.sh               # Deploy everything
    └── k3d-down.sh             # Tear down cluster
```

## Configuration

### Apollo Router (Helm)

The router is deployed using the official Apollo Helm chart with custom values in [helm-values/router-values.yaml](helm-values/router-values.yaml).

Key configurations:
- **Image**: `ghcr.io/apollographql/router:v2.8.0`
- **Service Type**: LoadBalancer (exposed on localhost:4000)
- **Configuration**: Mounted from ConfigMap (uses same `router.yaml` as Docker Compose)
- **Supergraph Schema**: Mounted from ConfigMap
- **Environment Variables**: Loaded from ConfigMap and Secret

### Subgraphs

Each subgraph is deployed as:
- **Deployment**: 1 replica, health checks, resource limits
- **Service**: ClusterIP (internal only)
- **Image**: Built locally and imported to k3d

### Secrets and ConfigMaps

**Secret** (`dash0-auth`):
- `token`: Dash0 authentication token

**ConfigMap** (`apollo-config`):
- Dash0 endpoints
- Service name, version, environment

**ConfigMap** (`router-config`):
- Router configuration (`router.yaml`)

**ConfigMap** (`supergraph-schema`):
- Composed supergraph schema

## Docker Compose vs k3d

### Docker Compose
✅ Simpler, faster startup
✅ Direct port mapping
✅ Better for local development
❌ Not representative of production

### k3d (Kubernetes)
✅ Production-like environment
✅ Tests Kubernetes-specific configurations
✅ Helm chart validation
✅ Service discovery, namespaces, RBAC
❌ Slightly more complex setup
❌ Requires more resources

## Useful Commands

```bash
# View all resources
kubectl get all -n apollo-dash0-demo

# View logs
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo
kubectl logs -f deployment/accounts -n apollo-dash0-demo

# Describe resources
kubectl describe deployment apollo-router -n apollo-dash0-demo

# Port forward (alternative to LoadBalancer)
kubectl port-forward -n apollo-dash0-demo service/apollo-router 4000:4000

# Update router configuration
kubectl create configmap router-config \
  --from-file=router.yaml=router/router.yaml \
  --namespace=apollo-dash0-demo \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart router to pick up config changes
kubectl rollout restart deployment/apollo-router -n apollo-dash0-demo

# View Helm release
helm list -n apollo-dash0-demo

# Upgrade Helm release
helm upgrade apollo-router \
  oci://ghcr.io/apollographql/helm-charts/router \
  --namespace apollo-dash0-demo \
  --values k8s/helm-values/router-values.yaml
```

## Troubleshooting

### Pods not starting
```bash
# Check pod status
kubectl get pods -n apollo-dash0-demo

# View pod events
kubectl describe pod <pod-name> -n apollo-dash0-demo

# Check logs
kubectl logs <pod-name> -n apollo-dash0-demo
```

### Router can't reach subgraphs
- Ensure all subgraphs are healthy: `kubectl get pods -n apollo-dash0-demo`
- Check service endpoints: `kubectl get svc -n apollo-dash0-demo`
- Verify DNS resolution from router pod

### Can't access localhost:4000
- Check LoadBalancer service: `kubectl get svc -n apollo-dash0-demo`
- Verify k3d cluster is running: `k3d cluster list`
- Try port-forward as alternative: `kubectl port-forward -n apollo-dash0-demo service/apollo-router 4000:4000`

### Dash0 not receiving telemetry

**From Apollo Router:**
- Verify secrets are correct: `kubectl get secret dash0-auth -n apollo-dash0-demo -o yaml`
- Check router logs for OTLP export errors: `kubectl logs deployment/apollo-router -n apollo-dash0-demo`
- Ensure endpoints are correct in ConfigMap

**From Dash0 Operator (Kubernetes metrics/traces):**
- Check operator configuration: `kubectl get dash0operatorconfiguration -o yaml`
- View operator logs: `kubectl logs -l app.kubernetes.io/name=dash0-operator -n dash0-system`
- Check collector pods: `kubectl get pods -n dash0-system`
- View collector logs: `kubectl logs -l app.kubernetes.io/name=opentelemetry-collector -n dash0-system`

**Note on HTTP vs gRPC Export:**
The operator is configured to use HTTP export (`https://ingress.us-west-2.aws.dash0.com`) instead of gRPC export (port 4317). This is because some authentication tokens may be blocked when using the gRPC endpoint. The HTTP endpoint provides better compatibility and reliability.

## Next Steps

- Add Horizontal Pod Autoscaler (HPA) for router
- Add network policies for security
- Add Prometheus ServiceMonitor
- Configure Ingress for external access
- Add Vegeta load generator deployment
