# Deployment Reference Guide

Complete command reference for deploying and managing the apollo-router-dash0-demo project.

**See also:**
- `kubernetes/README.md` - Kubernetes setup guide
- `docker-compose/README.md` - Docker Compose setup guide
- `docs/COMMANDS.md` - General command reference
- `docs/LOGS.md` - Log management

---

## Docker Compose (Local Development)

### Start Services
```bash
cd docker-compose
docker-compose up -d
```

### Stop Services
```bash
cd docker-compose
docker-compose down
```

### View Logs
```bash
cd docker-compose
docker-compose logs -f
docker-compose logs -f router
docker-compose logs -f postgres
```

### Check Status
```bash
cd docker-compose
docker-compose ps
```

### Access Services
- **Router**: http://localhost:4000
- **PostgreSQL**: `localhost:5432` (user: `inventory_user`, password from `.env`)

---

## Kubernetes (k3d Cluster)

### Cluster Lifecycle

**Start cluster:**
```bash
./kubernetes/start.sh
```
Creates k3d cluster, applies manifests, deploys Helm charts, configures Dash0 operator.

**Check status:**
```bash
./kubernetes/status.sh
```

**Stop cluster (pause):**
```bash
./kubernetes/stop.sh
```

**Delete cluster entirely:**
```bash
./kubernetes/scripts/k3d-down.sh
```
Or use: `k3d cluster delete apollo-dash0-demo`

**Start fresh cluster (advanced):**
```bash
./kubernetes/scripts/start-cluster.sh
```
Alternative full startup with verbose output.

### Quick Restarts

**Restart router only** (20-30 sec):
```bash
./kubernetes/scripts/redeploy-router.sh
```

**Restart all apps** (30-60 sec):
```bash
./kubernetes/scripts/redeploy-apps.sh
```

**Restart Dash0 operator:**
```bash
./kubernetes/scripts/restart-dash0.sh
```

### Configuration Management

**Update ConfigMaps from .env** (5-10 sec):
```bash
./kubernetes/scripts/update-configmap.sh
```
Updates `apollo-config` without full redeployment.

**Update router config only:**
```bash
kubectl create configmap router-config \
    --from-file=router.yaml=router/router.yaml \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

./kubernetes/scripts/redeploy-router.sh
```

**Update supergraph schema:**
```bash
kubectl create configmap supergraph-schema \
    --from-file=supergraph.graphql=router/supergraph.graphql \
    --namespace=apollo-dash0-demo \
    --dry-run=client -o yaml | kubectl apply -f -

./kubernetes/scripts/redeploy-router.sh
```

### Helm Management

**Deploy/upgrade Apollo Router:**
```bash
helm upgrade --install apollo-router \
    oci://ghcr.io/apollographql/helm-charts/router \
    --version 2.8.0 \
    --namespace apollo-dash0-demo \
    --values kubernetes/helm-values/router-values.yaml \
    --wait
```

Or use the convenience script:
```bash
./kubernetes/scripts/upgrade-router-helm.sh
```

**Deploy/upgrade Dash0 Operator:**
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

### Image Management

**Rebuild and reimport Docker images into k3d:**
```bash
./kubernetes/scripts/rebuild-and-reimport-images.sh
```
Rebuilds all subgraph images and imports them into the k3d cluster. Run after modifying subgraph code.

**Verify PostgreSQL integration:**
```bash
./kubernetes/scripts/verify-postgres-integration.sh
```
Checks database connectivity and schema setup.

---

### PostgreSQL Management

**Show cluster status:**
```bash
./kubernetes/scripts/manage-postgres.sh status
```

**View database logs:**
```bash
./kubernetes/scripts/manage-postgres.sh logs
```

**Connect to database:**
```bash
./kubernetes/scripts/manage-postgres.sh connect
```

**Port forward for external tools:**
```bash
./kubernetes/scripts/manage-postgres.sh port-forward
# In another terminal: psql -h localhost -U inventory_user -d inventory_db
```

**Restart cluster:**
```bash
./kubernetes/scripts/manage-postgres.sh restart
```

**Reset data (WARNING: deletes all data):**
```bash
./kubernetes/scripts/manage-postgres.sh reset-data
```

**Manual port forward:**
```bash
kubectl port-forward -n apollo-dash0-demo svc/inventory-db-rw 5432:5432
```

**Connect manually:**
```bash
psql -h localhost -U inventory_user -d inventory_db
```

### Troubleshooting

**View router logs:**
```bash
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo
```

**Check router status:**
```bash
kubectl get deployment apollo-router -n apollo-dash0-demo
kubectl describe deployment apollo-router -n apollo-dash0-demo
```

**View all ConfigMaps:**
```bash
kubectl get configmaps -n apollo-dash0-demo
```

**Inspect ConfigMap:**
```bash
kubectl describe configmap apollo-config -n apollo-dash0-demo
```

**Port forward to router:**
```bash
kubectl port-forward -n apollo-dash0-demo service/apollo-router 4000:4000
```

**Check all pods:**
```bash
kubectl get pods -n apollo-dash0-demo
```

**Pod logs by service:**
```bash
kubectl logs -f deployment/inventory -n apollo-dash0-demo
kubectl logs -f deployment/accounts -n apollo-dash0-demo
kubectl logs -f deployment/products -n apollo-dash0-demo
kubectl logs -f deployment/reviews -n apollo-dash0-demo
```

**Database pod logs:**
```bash
kubectl logs -f pod/inventory-db-1 -n apollo-dash0-demo
```

---

## ConfigMap Structure

### apollo-config
**Created by**: `kubernetes/start.sh`
**Source**: `.env` file

Contains:
- `DASH0_DATASET`
- `DASH0_METRICS_ENDPOINT`
- `DASH0_TRACES_ENDPOINT`
- `SERVICE_NAME` (default: apollo-router-demo)
- `SERVICE_VERSION` (default: 2.0)
- `ENVIRONMENT` (default: demo)

### supergraph-schema
**Created by**: `kubernetes/start.sh`
**Source**: `router/supergraph.graphql`

Contains the federated GraphQL schema.

### router-config
**Created by**: `kubernetes/start.sh`
**Source**: `router/router.yaml`

Contains Apollo Router configuration (telemetry, plugins, introspection, etc.).

---

## Telemetry Configuration

### Router Events
- `error` - Request lifecycle errors logged at error level
- `graphql_error` - Responses with GraphQL errors (includes HTTP status, operation name)

### Router Spans
- Operation name (supergraph level)
- HTTP response status
- GraphQL error flags
- Error messages

### Exporters
- **Metrics**: OTLP HTTP with delta temporality
- **Traces**: OTLP HTTP with W3C Trace Context propagation
- **Auth**: Bearer token + Dash0-Dataset header

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

**Results include:**
- Request rate (requests/sec)
- Response time percentiles (min, max, avg)
- Success/failure breakdown
- Per-operation statistics
