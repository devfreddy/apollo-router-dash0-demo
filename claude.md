# Guidance on outputs

Minimize documentation produced, keep documentation that's needed concise. Differentatiate between what an LLM would need and what I need to see.

Keep documentation in the /docs folder.


# Apollo Router Dash0 Demo - Deployment Reference

The rest of the document contains key deployment scripts and commands for the apollo-router-dash0-demo project.

## Quick Deployment Commands

### Full Initial Deployment
```bash
./k8s/scripts/k3d-up.sh
```
Brings up entire k3d cluster with all services, configmaps, secrets, and helm deployments.

### Quick Router Restart (Recommended for Config Changes)
```bash
./k8s/scripts/redeploy-router.sh
```
Restarts just the Apollo Router deployment. Time: 20-30 seconds.

### Update ConfigMap from .env
```bash
./k8s/scripts/update-configmap.sh
```
Updates apollo-config configmap without requiring full redeployment. Time: 5-10 seconds.

### Redeploy All Apps
```bash
./k8s/scripts/redeploy-apps.sh
```
Restarts all deployments (router + all subgraphs). Time: 30-60 seconds.

### Restart Dash0 Operator
```bash
./k8s/scripts/restart-dash0.sh
```
Restarts Dash0 operator and reapplies monitoring configuration.

### PostgreSQL Setup (Kubernetes)
```bash
# Install CloudNativePG operator (one-time)
helm repo add cnpg https://cloudnative-pg.io/charts
helm repo update
helm install cnpg cnpg/cloudnative-pg --namespace cnpg-system --create-namespace

# Deploy inventory database cluster
kubectl apply -f k8s/base/postgres-cluster.yaml
```

---

## ConfigMap Management

### apollo-config ConfigMap
**Location**: Created by `k8s/scripts/k3d-up.sh` (lines 144-152)

Contains environment variables:
- `DASH0_DATASET`
- `DASH0_METRICS_ENDPOINT`
- `DASH0_TRACES_ENDPOINT`
- `SERVICE_NAME` (default: apollo-router-demo)
- `SERVICE_VERSION` (default: 2.0)
- `ENVIRONMENT` (default: demo)

**Update command**:
```bash
kubectl create configmap apollo-config \
    --from-literal=DASH0_DATASET="${DASH0_DATASET}" \
    --from-literal=DASH0_METRICS_ENDPOINT="$DASH0_METRICS_ENDPOINT" \
    --from-literal=DASH0_TRACES_ENDPOINT="$DASH0_TRACES_ENDPOINT" \
    --from-literal=SERVICE_NAME="${SERVICE_NAME:-apollo-router-demo}" \
    --from-literal=SERVICE_VERSION="${SERVICE_VERSION:-2.0}" \
    --from-literal=ENVIRONMENT="${ENVIRONMENT:-demo}" \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -
```

### supergraph-schema ConfigMap
**Location**: Created by `k8s/scripts/k3d-up.sh` (lines 245-249)

Contains the supergraph GraphQL schema from `router/supergraph.graphql`.

**Update command**:
```bash
kubectl create configmap supergraph-schema \
    --from-file=supergraph.graphql=router/supergraph.graphql \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -
```

### router-config ConfigMap
**Location**: Created by `k8s/scripts/k3d-up.sh` (lines 252-256)

Contains router configuration from `router/router.yaml`.

**Update command**:
```bash
kubectl create configmap router-config \
    --from-file=router.yaml=router/router.yaml \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -
```

---

## Helm Deployment Commands

### Apollo Router Helm Installation
```bash
helm upgrade --install apollo-router \
    oci://ghcr.io/apollographql/helm-charts/router \
    --version 2.8.0 \
    --namespace apollo-dash0-demo \
    --values k8s/helm-values/router-values.yaml \
    --wait
```

**Values file**: `k8s/helm-values/router-values.yaml`
- Image: `ghcr.io/apollographql/router:v2.8.0`
- Service Type: LoadBalancer (port 4000)
- Includes full telemetry configuration with OTLP exporters

### Dash0 Operator Helm Installation
```bash
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
```

---

## File Locations

| Purpose | File Path |
|---------|-----------|
| Full k3d setup | `k8s/scripts/k3d-up.sh` |
| Redeploy router | `k8s/scripts/redeploy-router.sh` |
| Redeploy all apps | `k8s/scripts/redeploy-apps.sh` |
| Update configmap | `k8s/scripts/update-configmap.sh` |
| Restart Dash0 | `k8s/scripts/restart-dash0.sh` |
| Manage PostgreSQL | `k8s/scripts/manage-postgres.sh` |
| Router Helm values | `k8s/helm-values/router-values.yaml` |
| Router config | `router/router.yaml` |
| Supergraph schema | `router/supergraph.graphql` |
| Kustomization | `k8s/base/kustomization.yaml` |
| PostgreSQL cluster (K8s) | `k8s/base/postgres-cluster.yaml` |
| Inventory subgraph (K8s) | `k8s/base/subgraphs/inventory.yaml` |
| Inventory database module | `subgraphs/inventory/db/database.js` |
| Database schema | `subgraphs/inventory/db/init.sql` |
| GraphQL load test | `scripts/inventory-load-test.js` |
| Database stress test | `scripts/inventory-db-stress-test.js` |
| PostgreSQL documentation | `docs/POSTGRES_SETUP.md` |

---

## Telemetry Configuration

### Router Events (from router-values.yaml)
The router has the following events configured:

**Standard events**:
- `error` - Request lifecycle errors logged at error level

**Custom events**:
- `graphql_error` - Logs responses containing GraphQL errors with attributes:
  - HTTP response status code
  - GraphQL operation name
  - GraphQL error indicator

### Router Span Attributes
- Operation name (supergraph level)
- HTTP response status
- GraphQL error flags
- Error messages

### Exporters
- **Metrics**: OTLP HTTP with delta temporality
- **Traces**: OTLP HTTP with W3C Trace Context propagation
- **Authentication**: Bearer token + Dash0-Dataset header

---

## Common Workflows

### After modifying router-values.yaml
```bash
helm upgrade apollo-router \
    oci://ghcr.io/apollographql/helm-charts/router \
    --namespace apollo-dash0-demo \
    --values k8s/helm-values/router-values.yaml
```

### After modifying router/router.yaml
```bash
# Update configmap
kubectl create configmap router-config \
    --from-file=router.yaml=router/router.yaml \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Restart router to pick up changes
./k8s/scripts/redeploy-router.sh
```

### After modifying router/supergraph.graphql
```bash
# Update configmap
kubectl create configmap supergraph-schema \
    --from-file=supergraph.graphql=router/supergraph.graphql \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

# Restart router to pick up changes
./k8s/scripts/redeploy-router.sh
```

### Full cluster teardown
```bash
k3d cluster delete apollo-dash0-demo
```

---

## Troubleshooting

### View router logs
```bash
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo
```

### Check router status
```bash
kubectl get deployment apollo-router -n apollo-dash0-demo
kubectl describe deployment apollo-router -n apollo-dash0-demo
```

### View all configmaps
```bash
kubectl get configmaps -n apollo-dash0-demo
```

### Describe a configmap
```bash
kubectl describe configmap apollo-config -n apollo-dash0-demo
```

### Port forward to router
```bash
kubectl port-forward -n apollo-dash0-demo service/apollo-router 4000:4000
```

### PostgreSQL & Inventory Database

### Management Script

```bash
# Show cluster status
./k8s/scripts/manage-postgres.sh status

# View logs
./k8s/scripts/manage-postgres.sh logs

# Connect to database
./k8s/scripts/manage-postgres.sh connect

# Port forward for external tools
./k8s/scripts/manage-postgres.sh port-forward

# Restart cluster
./k8s/scripts/manage-postgres.sh restart

# Reset data (WARNING: deletes all data)
./k8s/scripts/manage-postgres.sh reset-data
```

### Manual Management

View database logs:
```bash
kubectl logs -f pod/inventory-db-1 -n apollo-dash0-demo
```

Connect to database:
```bash
# Port forward
kubectl port-forward -n apollo-dash0-demo svc/inventory-db-rw 5432:5432

# Connect (in another terminal)
psql -h localhost -U inventory_user -d inventory_db
```

Check cluster status:
```bash
kubectl get cluster -n apollo-dash0-demo
kubectl describe cluster inventory-db -n apollo-dash0-demo
```

Check inventory deployment database connectivity:
```bash
kubectl logs -f deployment/inventory -n apollo-dash0-demo
```

View inventory data:
```bash
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- psql -U inventory_user -d inventory_db -c "SELECT * FROM inventory;"
```

---

## Performance Testing

### GraphQL Load Test
```bash
# Local development
node scripts/inventory-load-test.js 60 10

# Custom configuration
node scripts/inventory-load-test.js 120 20 http://localhost:4000
```

### Database Stress Test
```bash
# Docker Compose environment
node scripts/inventory-db-stress-test.js 60 10 localhost 5432

# Kubernetes environment
kubectl exec -it deployment/inventory -n apollo-dash0-demo -- \
  node scripts/inventory-db-stress-test.js 60 5 inventory-db-rw 5432
```

Results include:
- Request rate (requests/sec)
- Response time percentiles (min, max, avg)
- Success/failure breakdown
- Per-operation statistics
