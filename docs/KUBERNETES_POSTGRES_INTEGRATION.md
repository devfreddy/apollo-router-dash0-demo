# Kubernetes PostgreSQL Integration Guide

This document explains how PostgreSQL has been integrated into the Kubernetes deployment automation.

## Integration Points

### 1. Automatic Setup in k3d-up.sh

The main Kubernetes setup script (`k8s/scripts/k3d-up.sh`) has been updated to:

1. **Install CloudNativePG Operator** (lines 158-175)
   - Adds CloudNativePG Helm repository
   - Installs the operator in `cnpg-system` namespace
   - Waits for operator to be ready

2. **Deploy PostgreSQL Cluster via Kustomize** (lines 221-228)
   - PostgreSQL cluster defined in `k8s/base/postgres-cluster.yaml`
   - Deployed through existing Kustomize workflow
   - Waits for cluster to be healthy before deploying subgraphs

3. **Inventory Subgraph Configuration** (lines 245-250)
   - Automatically receives database environment variables
   - Services depend on database being healthy
   - Configured through `k8s/base/subgraphs/inventory.yaml`

### 2. Kustomization Integration

**File: `k8s/base/kustomization.yaml`**

PostgreSQL cluster is included as the first resource:
```yaml
resources:
  - postgres-cluster.yaml  # PostgreSQL first, then other services
  - dash0-monitoring.yaml
  - website.yaml
  - ...
```

This ensures the database is created before the inventory subgraph tries to connect.

### 3. Inventory Subgraph Deployment

**File: `k8s/base/subgraphs/inventory.yaml`**

Updated with:
- Database connection environment variables
- Service dependency: `inventory-db-rw`
- Secret reference for database password
- Connection pooling configuration

### 4. PostgreSQL Cluster Definition

**File: `k8s/base/postgres-cluster.yaml`**

Complete CloudNativePG cluster definition including:
- Initial database creation with schema
- Seed data (5 products)
- Performance tuning parameters
- Backup configuration (ready for S3)
- Services for read-write and read-only access

## Setup Flow

```
k3d-up.sh execution flow:
├── Validate prerequisites (.env file)
├── Create k3d cluster
├── Install CloudNativePG operator ← NEW
├── Create Kubernetes secrets & ConfigMaps
├── Install Dash0 operator
├── Deploy all resources via Kustomize ← INCLUDES PostgreSQL
│   └── PostgreSQL cluster starts initializing
│   └── Waits for database to be healthy ← NEW
│   └── Inventory subgraph created
│   └── Inventory subgraph connects to database
├── Build and import subgraph images
├── Wait for deployments
├── Install Apollo Router
└── Complete
```

## Management Scripts

### k8s/scripts/manage-postgres.sh

New utility script for PostgreSQL management:

```bash
./k8s/scripts/manage-postgres.sh [command]

Commands:
  status          - Show cluster status
  logs            - Stream database logs
  connect         - Connect to database via psql
  port-forward    - Port forward database
  restart         - Restart cluster
  reset-data      - Delete and reinitialize database
```

### k8s/scripts/verify-postgres-integration.sh

Verification script to check integration is working:

```bash
./k8s/scripts/verify-postgres-integration.sh

Checks:
  1. PostgreSQL cluster exists and is healthy
  2. Database pod is running
  3. Database services exist
  4. Inventory subgraph is deployed
  5. Database connectivity from inventory pod
  6. Database contains seed data
  7. Apollo Router is accessible
  8. GraphQL query returns inventory data
```

## Deployment Timeline

### With PostgreSQL Integration

**Before:** ~3-4 minutes
**After:** ~4-5 minutes (additional 1 minute for operator installation)

Timeline breakdown:
```
0:00   - Start script
0:15   - Create k3d cluster
0:45   - Install CloudNativePG operator ← +45 seconds
1:30   - Install Dash0 operator
2:30   - Deploy resources via Kustomize
3:00   - Wait for PostgreSQL cluster ← +30-60 seconds for database initialization
4:00   - Build and import images
4:30   - Deploy router
5:00   - Deployment complete
```

## Resource Requirements

### CloudNativePG Operator
- **Namespace**: `cnpg-system`
- **Resources**: ~100m CPU, 256Mi memory (operator pod)

### PostgreSQL Cluster
- **Namespace**: `apollo-dash0-demo`
- **Resources per instance**:
  - **CPU**: 100m (request) / 500m (limit)
  - **Memory**: 256Mi (request) / 512Mi (limit)
- **Storage**: 10Gi PersistentVolumeClaim
- **Network**: 1 instance (scale to 3+ for HA)

### Total Overhead
- **CPU**: ~200m (operator + database)
- **Memory**: ~512Mi (operator + database)
- **Disk**: 10Gi

## Automatic Features

### Schema Initialization

Database schema and seed data are automatically created through:

1. **CloudNativePG bootstrap**: `initdb.postInitApplicationSQL`
2. **SQL scripts**: Tables, indexes, and seed data created in one transaction
3. **Idempotent**: Safe to re-apply without data loss

### Service Discovery

Kubernetes services automatically created:
- `inventory-db-rw`: Read-write endpoint (primary)
- `inventory-db-r`: Read-only endpoint (replicas, when scaled)

Inventory subgraph connects to `inventory-db-rw` via DNS.

### Health Checks

CloudNativePG provides:
- Pod readiness probes
- Cluster health status
- Automated failover (when replicas are configured)
- Self-healing on pod restart

## Updating PostgreSQL Configuration

### After Modifying postgres-cluster.yaml

```bash
# Update the cluster
kubectl apply -f k8s/base/postgres-cluster.yaml

# Monitor the update
kubectl describe cluster inventory-db -n apollo-dash0-demo
kubectl logs -f pod/inventory-db-1 -n apollo-dash0-demo
```

### After Modifying Inventory Subgraph Database Config

```bash
# Update deployment
kubectl apply -f k8s/base/subgraphs/inventory.yaml

# Restart inventory pods
kubectl rollout restart deployment/inventory -n apollo-dash0-demo
```

## Troubleshooting

### PostgreSQL Cluster Won't Start

```bash
# Check cluster status
kubectl describe cluster inventory-db -n apollo-dash0-demo

# Check pod logs
kubectl logs pod/inventory-db-1 -n apollo-dash0-demo

# Check events
kubectl get events -n apollo-dash0-demo --sort-by='.lastTimestamp'
```

### Inventory Subgraph Can't Connect

```bash
# Check inventory logs
kubectl logs -f deployment/inventory -n apollo-dash0-demo

# Test connectivity from within cluster
kubectl exec -it deployment/inventory -n apollo-dash0-demo -- \
  psql -h inventory-db-rw -U inventory_user -d inventory_db -c "SELECT 1"
```

### Database Credentials Not Working

Verify secret is created:
```bash
kubectl get secret inventory-db-credentials -n apollo-dash0-demo
kubectl describe secret inventory-db-credentials -n apollo-dash0-demo
```

Check what the inventory pod received:
```bash
kubectl exec deployment/inventory -n apollo-dash0-demo -- env | grep DATABASE
```

## High Availability Setup

To enable HA with multiple replicas:

Edit `k8s/base/postgres-cluster.yaml`:
```yaml
spec:
  instances: 3  # Change from 1 to 3
```

Then:
```bash
kubectl apply -f k8s/base/postgres-cluster.yaml

# Monitor scaling
kubectl get pods -n apollo-dash0-demo -l cnpg.io/cluster=inventory-db

# Services will automatically route:
# - inventory-db-rw: Primary (read/write)
# - inventory-db-r: Replicas (read-only)
```

## Backup & Recovery

### Enable S3 Backups

Edit `k8s/base/postgres-cluster.yaml` and uncomment the `backup.barmanObjectStore` section:

```yaml
backup:
  barmanObjectStore:
    s3Credentials:
      accessKeyId:
        name: aws-creds
        key: access-key-id
      secretAccessKey:
        name: aws-creds
        key: secret-access-key
    bucket: inventory-db-backups
    endpoint: s3.amazonaws.com
```

Create AWS credentials secret:
```bash
kubectl create secret generic aws-creds \
  --from-literal=access-key-id=YOUR_KEY \
  --from-literal=secret-access-key=YOUR_SECRET \
  -n apollo-dash0-demo
```

### Manual Backup

```bash
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  pg_dump -U inventory_user -d inventory_db > backup.sql
```

### Restore from Backup

```bash
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db < backup.sql
```

## Performance Monitoring

### Check Database Size

```bash
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db -c "SELECT pg_size_pretty(pg_database_size('inventory_db'));"
```

### Monitor Connections

```bash
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### View Slow Queries

Enable in `postgres-cluster.yaml`:
```yaml
parameters:
  log_statement: "all"
  log_duration: "on"
```

Then:
```bash
kubectl logs pod/inventory-db-1 -n apollo-dash0-demo | grep "duration:"
```

## Integration with Dash0

PostgreSQL metrics are automatically instrumented:
- Query duration traces
- Connection pool metrics
- Error logs

View in Dash0:
1. Go to **Traces**
2. Filter by service: `inventory-subgraph`
3. Look for spans with `db.system: postgresql`
4. View metrics like `db.client.connections.usage`

## Next Steps

1. **Deploy**: Run `./k8s/scripts/k3d-up.sh`
2. **Verify**: Run `./k8s/scripts/verify-postgres-integration.sh`
3. **Manage**: Use `./k8s/scripts/manage-postgres.sh`
4. **Monitor**: Watch Dash0 for database telemetry
5. **Scale**: Increase replicas for HA in production

## Related Documentation

- [CloudNativePG Documentation](https://cloudnative-pg.io/)
- [PostgreSQL Setup Guide](POSTGRES_SETUP.md)
- [Deployment Reference](../CLAUDE.md)
- [PostgreSQL Migration Summary](../POSTGRES_MIGRATION_SUMMARY.md)
