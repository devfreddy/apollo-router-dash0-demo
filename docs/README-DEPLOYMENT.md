# Kubernetes Deployment (k3d)

Production-like Kubernetes deployment with full observability using Dash0.

## Prerequisites

- Docker
- k3d (auto-installed if missing)
- kubectl (auto-installed if missing)
- `.env` file in project root with Dash0 credentials

## Quick Start

```bash
# Start cluster and all services
./start.sh

# Check status
./status.sh

# Stop cluster
./stop.sh
```

## Architecture

```
┌─────────────────────────────────────────┐
│  Apollo Router (LoadBalancer, :4000)    │
├─────────────────────────────────────────┤
│  Subgraphs (ClusterIP services)         │
│  - Accounts (4001)                      │
│  - Reviews (4002)                       │
│  - Products (4003)                      │
│  - Inventory (4004)                     │
├─────────────────────────────────────────┤
│  PostgreSQL Cluster (CloudNativePG)     │
│  - inventory-db (replicated)            │
├─────────────────────────────────────────┤
│  Observability                          │
│  - Dash0 Operator (auto-instrumentation)│
│  - OTEL collectors                      │
└─────────────────────────────────────────┘
```

## Key Features

- **Kubernetes native**: Full k3d cluster with networking
- **Database**: CloudNativePG operator with replicated PostgreSQL
- **Observability**: Dash0 operator with auto-instrumentation
- **Configuration**: ConfigMaps for router and schema
- **Automation**: One-command startup with all dependencies

## Common Tasks

### View Logs

```bash
# Router logs
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo

# Subgraph logs
kubectl logs -f deployment/inventory -n apollo-dash0-demo

# All pods
kubectl logs -f -n apollo-dash0-demo --all-containers=true
```

### Update Configuration

**Router YAML:**
```bash
# Update shared/router/router.yaml, then:
kubectl create configmap router-config \
    --from-file=router.yaml=shared/router/router.yaml \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

./scripts/redeploy-router.sh
```

**Supergraph Schema:**
```bash
# Update shared/router/supergraph.graphql, then:
kubectl create configmap supergraph-schema \
    --from-file=supergraph.graphql=shared/router/supergraph.graphql \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

./scripts/redeploy-router.sh
```

### Database Operations

```bash
# Manage PostgreSQL
./scripts/manage-postgres.sh status
./scripts/manage-postgres.sh logs
./scripts/manage-postgres.sh connect
./scripts/manage-postgres.sh port-forward

# View data
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db -c "SELECT * FROM inventory;"
```

### Performance Testing

```bash
# GraphQL load test
node scripts/inventory-load-test.js 60 10

# Database stress test
kubectl exec -it deployment/inventory -n apollo-dash0-demo -- \
  node scripts/inventory-db-stress-test.js 60 5 inventory-db-rw 5432
```

## Useful Scripts

Located in `scripts/`:

- **k3d-up.sh** - Full cluster setup (runs automatically with `./start.sh`)
- **k3d-down.sh** - Destroy cluster
- **redeploy-router.sh** - Quick router restart (~20-30s)
- **redeploy-apps.sh** - Restart all deployments
- **rebuild-and-reimport-images.sh** - Rebuild and update subgraph images
- **update-configmap.sh** - Update apollo-config without redeployment
- **restart-dash0.sh** - Restart Dash0 operator
- **manage-postgres.sh** - PostgreSQL management utilities

## Environment Setup

Configuration from `.env`:
- `DASH0_AUTH_TOKEN` - Dash0 API token
- `DASH0_DATASET` - Dash0 dataset identifier
- `DASH0_REGION` - Dash0 region (us, eu)
- `DASH0_METRICS_ENDPOINT` - OTLP metrics endpoint
- `DASH0_TRACES_ENDPOINT` - OTLP traces endpoint

## Troubleshooting

**Cluster won't start?**
```bash
# Delete existing cluster
k3d cluster delete apollo-dash0-demo

# Try again
./start.sh
```

**Pods stuck in pending?**
```bash
# Check pod status
kubectl describe pod <pod-name> -n apollo-dash0-demo

# Check resource availability
kubectl top nodes
kubectl top pods -n apollo-dash0-demo
```

**Router not starting?**
```bash
# Check helm values
helm get values apollo-router -n apollo-dash0-demo

# Check configmaps
kubectl get configmaps -n apollo-dash0-demo
kubectl describe configmap router-config -n apollo-dash0-demo
```

## File Locations

| Purpose | Path |
|---------|------|
| Cluster setup | `scripts/k3d-up.sh` |
| Router deployment | `helm-values/router-values.yaml` |
| Subgraph definitions | `base/subgraphs/` |
| PostgreSQL setup | `base/postgres-cluster.yaml` |
| Kustomization | `base/kustomization.yaml` |
| Operator docs | `DASH0-OPERATOR.md` |

## Comparison with Docker Compose

| Aspect | Docker Compose | Kubernetes |
|--------|---|---|
| Setup time | ~1-2 minutes | ~5-10 minutes |
| Complexity | Simple | Enterprise-grade |
| Observability | Basic | Full (Dash0) |
| Scaling | Manual | Automatic |
| Production ready | No | Yes |

For quick local development, see `../docker-compose/README.md`.
