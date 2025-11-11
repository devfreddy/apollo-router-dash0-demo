# PostgreSQL Database Metrics Collection with Prometheus and Dash0

This guide explains how to collect PostgreSQL database-level metrics using a lightweight Prometheus exporter and the Dash0 operator's built-in Prometheus scraping capability.

## Overview

The PostgreSQL metrics collection architecture consists of:

1. **PostgreSQL Database** - Instrumented with `pg_stat_statements` extension
2. **Monitoring User** - Created with read-only access to metrics views
3. **PostgreSQL Prometheus Exporter** - Lightweight exporter exposing metrics endpoint
4. **Dash0 Operator** - Automatically scrapes Prometheus endpoints via annotations
5. **Dash0** - Receives and stores metrics for visualization and alerting

## What Metrics Are Collected

The PostgreSQL Prometheus exporter collects comprehensive database metrics including:

### Query Metrics (via pg_stat_statements)
- **Query execution statistics**
  - Calls per query
  - Total execution time
  - Mean/min/max execution times
  - Standard deviation of execution time
  - Rows affected

### Connection Metrics
- Active connections
- Idle connections
- Connection counts by state

### Transaction Metrics
- Committed transactions
- Rolled-back transactions
- Transaction counts

### Cache and I/O Metrics
- Buffer cache hit ratio
- Cache blocks hit vs read
- Heap blocks read and hit
- Index blocks read and hit

### Database Metrics
- Database size
- Table sizes
- Index sizes
- Table row counts

### Table-Level Metrics
- Sequential scans vs index scans
- Rows inserted/updated/deleted
- Live/dead tuples
- Last vacuum/analyze times

## Architecture

### Kubernetes Deployment

```
┌─────────────────────────────────────────┐
│  PostgreSQL (CloudNativePG)             │
│  - pg_stat_statements enabled           │
│  - dash0_monitor user created           │
└────────────┬───────────────────────────┘
             │ Port: 5432
             ▼
┌─────────────────────────────────────────┐
│  PostgreSQL Prometheus Exporter         │
│  - Port: 9187                           │
│  - Annotations:                         │
│    prometheus.io/scrape: "true"         │
│    prometheus.io/scrape-slow: "true"    │
│    prometheus.io/port: "9187"           │
│    prometheus.io/path: "/metrics"       │
└────────────┬───────────────────────────┘
             │ Prometheus format
             ▼
┌─────────────────────────────────────────┐
│  Dash0 Operator (DaemonSet)             │
│  - Scrapes prometheus.io annotations    │
│  - Collects metrics every 5 minutes     │
│  (slow scrape interval)                 │
└────────────┬───────────────────────────┘
             │ OTLP HTTP + gzip
             ▼
        ┌────────────────┐
        │  Dash0 Backend │
        │  - Ingest      │
        │  - Storage     │
        │  - Visualization
        └────────────────┘
```

### Docker Compose Deployment

For local development, the postgres-exporter container connects to the PostgreSQL service and exposes metrics on port 9187.

```
PostgreSQL (localhost:5432)
        ↓
postgres-exporter (localhost:9187)
        ↓
Prometheus compatible /metrics endpoint
```

## Setup Instructions

### Prerequisites

- PostgreSQL 13+ (already deployed via CloudNativePG or Docker)
- Dash0 account with API token
- Kubernetes cluster (for k3d) or Docker Compose

### Step 1: Enable pg_stat_statements Extension

The PostgreSQL initialization already includes `pg_stat_statements` creation:

**Kubernetes** (`kubernetes/base/postgres-cluster.yaml`):
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**Docker Compose** (`shared/subgraphs/inventory/db/init.sql`):
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

This enables collection of detailed query execution statistics.

### Step 2: Create Monitoring User

A dedicated monitoring user is automatically created during PostgreSQL initialization:

**Kubernetes & Docker Compose**:
```sql
-- Create monitoring user
CREATE USER IF NOT EXISTS dash0_monitor WITH PASSWORD 'dash0_secure_monitor_password';

-- Grant necessary permissions
GRANT pg_monitor TO dash0_monitor;
GRANT CONNECT ON DATABASE inventory_db TO dash0_monitor;
GRANT SELECT ON pg_stat_statements TO dash0_monitor;
```

The `pg_monitor` role provides read-only access to:
- System views (pg_stat_*)
- Activity information
- Replication information
- Object metadata

### Step 3: Deploy PostgreSQL Prometheus Exporter

#### For Kubernetes

The exporter is deployed as a Kubernetes deployment with:

**File**: `kubernetes/base/postgres-exporter.yaml`

Deploy using:
```bash
kubectl apply -f kubernetes/base/postgres-exporter.yaml
```

Components created:
- **ConfigMap**: `postgres-exporter-queries` - Custom Prometheus queries
- **Secret**: `postgres-exporter-credentials` - Database credentials
- **Deployment**: `postgres-exporter` - Exporter pod
- **Service**: `postgres-exporter` - Service exposure
- **ServiceAccount**: `postgres-exporter` - RBAC

The pod is automatically annotated with:
```yaml
prometheus.io/scrape: "true"
prometheus.io/scrape-slow: "true"  # 5-minute scrape interval
prometheus.io/port: "9187"
prometheus.io/path: "/metrics"
```

Verify deployment:
```bash
kubectl get pods -n apollo-dash0-demo -l app=postgres-exporter
kubectl logs -f deployment/postgres-exporter -n apollo-dash0-demo
```

#### For Docker Compose

The exporter is included in the docker-compose.yaml:

**File**: `docker-compose/docker-compose.yaml`

Start the environment:
```bash
cd docker-compose
docker-compose up -d
```

Verify the exporter is running:
```bash
docker-compose logs postgres-exporter
docker-compose ps postgres-exporter
```

### Step 4: Enable Prometheus Scraping in Dash0Monitoring

Ensure the Dash0Monitoring resource has Prometheus scraping enabled:

**File**: `kubernetes/base/dash0-monitoring.yaml`

```yaml
prometheusScraping:
  enabled: true
```

The Dash0 operator will automatically:
1. Discover the postgres-exporter pod (via annotations)
2. Scrape metrics every 5 minutes (slow scrape interval)
3. Forward metrics to Dash0

### Step 5: Verify Metrics Collection

#### Check Exporter Health

**Kubernetes**:
```bash
# Check pod status
kubectl get pods -n apollo-dash0-demo postgres-exporter-xxxxx

# Check pod logs
kubectl logs -f pod/postgres-exporter-xxxxx -n apollo-dash0-demo

# Port forward to access metrics endpoint
kubectl port-forward svc/postgres-exporter 9187:9187 -n apollo-dash0-demo

# Access metrics endpoint
curl http://localhost:9187/metrics
```

**Docker Compose**:
```bash
# Check container status
docker-compose ps postgres-exporter

# View logs
docker-compose logs -f postgres-exporter

# Access metrics endpoint
curl http://localhost:9187/metrics
```

#### Verify PostgreSQL Connection

**Kubernetes**:
```bash
# Port forward to PostgreSQL
kubectl port-forward svc/inventory-db-rw 5432:5432 -n apollo-dash0-demo

# Connect to database
psql -h localhost -U dash0_monitor -d inventory_db

# List extensions
\dx

# View pg_stat_statements
SELECT query, calls, total_time FROM pg_stat_statements LIMIT 5;
```

**Docker Compose**:
```bash
# Connect to database
psql -h localhost -U dash0_monitor -d inventory_db -p 5432

# Password: dash0_secure_monitor_password

# List extensions
\dx

# View query statistics
SELECT query, calls, total_time FROM pg_stat_statements LIMIT 5;
```

#### Check Dash0 Dashboard

1. Log in to Dash0 (https://app.dash0.com)
2. Navigate to your dataset: `apollo-router-demo`
3. Go to **Metrics** section
4. Search for `pg_` metrics
5. View PostgreSQL database metrics in dashboards

### Metrics Available in Dash0

Once data starts flowing (wait ~5 minutes for first scrape), you can query and visualize these metric families:

**Query Performance**:
- `pg_stat_statements_calls` - Query call count
- `pg_stat_statements_total_time` - Total query duration
- `pg_stat_statements_mean_time` - Average query duration
- `pg_stat_statements_max_time` - Maximum query duration
- `pg_stat_statements_min_time` - Minimum query duration
- `pg_stat_statements_stddev_time` - Standard deviation

**Database Activity**:
- `pg_stat_database_tup_returned` - Tuples returned
- `pg_stat_database_tup_fetched` - Tuples fetched
- `pg_stat_database_tup_inserted` - Tuples inserted
- `pg_stat_database_tup_updated` - Tuples updated
- `pg_stat_database_tup_deleted` - Tuples deleted

**Transactions**:
- `pg_stat_database_xact_commit` - Committed transactions
- `pg_stat_database_xact_rollback` - Rolled-back transactions

**Connections**:
- `pg_stat_database_numbackends` - Active backends

**Cache Performance**:
- `pg_stat_database_blks_hit` - Buffer cache hits
- `pg_stat_database_blks_read` - Disk reads

**Table I/O**:
- `pg_stat_user_tables_seq_scan` - Sequential scans
- `pg_stat_user_tables_idx_scan` - Index scans
- `pg_stat_user_tables_live_tup` - Live rows

## Configuration Details

### PostgreSQL Exporter Configuration

**Location**: `kubernetes/base/postgres-exporter.yaml` (Kubernetes)
               Uses standard postgres_exporter image with custom queries ConfigMap

**Key Configuration**:
```yaml
env:
  DATA_SOURCE_NAME: "postgresql://dash0_monitor:password@host:5432/database?sslmode=disable"
  PG_EXPORTER_EXCLUDE_DATABASES: "postgres,template0,template1"
```

### Prometheus Annotations

The exporter pod includes standard Prometheus discovery annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"              # Enable scraping
  prometheus.io/scrape-slow: "true"        # Use 5-minute interval (not 1-minute)
  prometheus.io/port: "9187"                # Metrics port
  prometheus.io/path: "/metrics"            # Metrics endpoint path
```

The Dash0 operator automatically discovers and scrapes these endpoints.

### Scrape Interval

The exporter is configured with **5-minute slow scrape interval**. This is appropriate for PostgreSQL because:
- Query statistics don't change rapidly
- Database metrics are stable
- Reduces load on both exporter and Dash0

To change to regular 1-minute scraping:
```yaml
prometheus.io/scrape-slow: "false"
# Then prometheus.io/scrape: "true" will use 1-minute interval
```

## Troubleshooting

### No Metrics Appearing in Dash0

**Check 1: Verify exporter is running**
```bash
# Kubernetes
kubectl get pods -n apollo-dash0-demo -l app=postgres-exporter

# Docker Compose
docker-compose ps postgres-exporter
```

**Check 2: Verify Prometheus scraping is enabled**
```bash
# Kubernetes - check Dash0Monitoring resource
kubectl get dash0monitoring -n apollo-dash0-demo -o yaml

# Should show:
# prometheusScraping:
#   enabled: true
```

**Check 3: Verify exporter can connect to PostgreSQL**
```bash
# Check exporter logs
kubectl logs deployment/postgres-exporter -n apollo-dash0-demo
docker-compose logs postgres-exporter

# Look for connection errors like:
# "failed to connect to postgresql"
# "permission denied"
```

**Check 4: Test metrics endpoint directly**
```bash
# Kubernetes
kubectl port-forward svc/postgres-exporter 9187:9187 -n apollo-dash0-demo
curl http://localhost:9187/metrics | head -20

# Docker Compose
curl http://localhost:9187/metrics | head -20
```

**Check 5: Verify database credentials**
```bash
# Kubernetes - check secret
kubectl get secret postgres-exporter-credentials -n apollo-dash0-demo -o jsonpath='{.data.username}' | base64 -d

# Should output: dash0_monitor
```

### Exporter Health Check Failing

**Kubernetes**:
```bash
kubectl describe pod postgres-exporter-xxxxx -n apollo-dash0-demo
kubectl logs postgres-exporter-xxxxx -n apollo-dash0-demo
```

**Docker Compose**:
```bash
docker-compose logs postgres-exporter | tail -50
```

### PostgreSQL Connection Refused

1. **Verify PostgreSQL is running**:
   ```bash
   # Kubernetes
   kubectl get pods -n apollo-dash0-demo -l cnpg.io/cluster=inventory-db

   # Docker Compose
   docker-compose ps postgres
   ```

2. **Verify network connectivity**:
   ```bash
   # Kubernetes - test DNS resolution
   kubectl run -it --rm debug --image=busybox --restart=Never -- \
     nslookup inventory-db-rw.apollo-dash0-demo.svc.cluster.local

   # Docker Compose - test connectivity
   docker-compose exec postgres-exporter curl -v telnet://postgres:5432
   ```

3. **Verify credentials are correct**:
   ```bash
   psql -h <host> -U dash0_monitor -d inventory_db -c "SELECT 1"
   # Password: dash0_secure_monitor_password
   ```

### High Memory Usage by Exporter

The Prometheus exporter typically uses only 30-50MB of RAM. If it's using more:

1. **Check if PostgreSQL has many queries**: Run `SELECT COUNT(*) FROM pg_stat_statements;`
2. **Reduce query history**: Reset pg_stat_statements: `SELECT pg_stat_statements_reset();`
3. **Increase resource limits**: Edit the deployment and increase `resources.limits.memory`

### Prometheus Metrics Not Found

If the `/metrics` endpoint returns an error:

1. **Check exporter is fully initialized**:
   ```bash
   kubectl logs -f deployment/postgres-exporter -n apollo-dash0-demo
   ```

2. **Wait for PostgreSQL to initialize**: The exporter needs ~30 seconds for PostgreSQL to be ready

3. **Verify pg_stat_statements extension exists**:
   ```bash
   psql -U dash0_monitor -d inventory_db -c "\dx" | grep stat_statements
   ```

## Performance Considerations

### Impact on PostgreSQL

The PostgreSQL Prometheus exporter has minimal impact:
- Non-blocking queries to system views
- Read-only access via `pg_monitor` role
- Scrape interval: 5 minutes (configurable)
- Typical query time: <5ms per scrape

### Network Bandwidth

Typical metrics volume:
- ~100-200 metric samples per scrape
- ~10-20 KB per scrape (uncompressed)
- ~10-20 KB per scrape (Dash0 gzip)
- ~2.4 MB per day

### Resource Usage

Prometheus exporter resource usage:
- **Memory**: 30-50 MB typical
- **CPU**: <50m typical
- **Network**: Minimal (5-min intervals)

## Comparison with Other Approaches

### vs. OpenTelemetry Collector with PostgreSQL Receiver
- ✅ **Lighter**: 30-50MB vs. 200-300MB
- ✅ **Simpler**: One focused tool vs. full OTel Collector
- ✅ **Integrated**: Works with existing Dash0 Prometheus scraping
- ✅ **Less overhead**: Smaller image, fewer dependencies
- ❌ **Less flexible**: Specifically for PostgreSQL (vs. multiple receiver types)

### vs. Manual pg_stat_statements Queries
- ✅ **Automated**: No manual SQL queries needed
- ✅ **Persistent**: Metrics stored in Dash0 for long-term analysis
- ✅ **Alertable**: Can create alerts based on metrics
- ❌ **Exported**: Data leaves the database (security consideration)

## Next Steps

1. **View Metrics**: Check the PostgreSQL dashboard in Dash0
2. **Create Alerts**: Set up alerts for slow queries or performance degradation
3. **Optimize Queries**: Use `pg_stat_statements` data to identify bottlenecks
4. **Monitor Trends**: Track database performance over time
5. **Correlate Data**: Link database metrics with application traces

## References

- [PostgreSQL Prometheus Exporter](https://github.com/prometheuscommunity/postgres_exporter)
- [PostgreSQL pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Prometheus Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [CloudNativePG Documentation](https://cloudnative-pg.io/)
- [Dash0 Operator Documentation](https://www.dash0.com/documentation/dash0/dash0-kubernetes-operator)

## Related Documentation

- [PostgreSQL Setup](POSTGRES_SETUP.md)
- [Kubernetes Deployment Guide](KUBERNETES_POSTGRES_INTEGRATION.md)
- [Database Management Scripts](../kubernetes/scripts/manage-postgres.sh)
- [Deployment Reference](DEPLOYMENT_REFERENCE.md)
