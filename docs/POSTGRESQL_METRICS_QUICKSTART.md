# PostgreSQL Metrics Collection - Quick Start

Get PostgreSQL database metrics flowing to Dash0 in 5 minutes using a lightweight Prometheus exporter and the Dash0 operator's built-in Prometheus scraping.

## What You Get

- Real-time query execution statistics (via pg_stat_statements)
- Connection and transaction metrics
- Buffer cache and I/O performance
- Database size and growth tracking
- Lightweight setup: only 30-50MB memory overhead

## Kubernetes (k3d)

### 1. Deploy the Prometheus Exporter

```bash
# From project root
kubectl apply -f kubernetes/base/postgres-exporter.yaml
```

### 2. Enable Prometheus Scraping

```bash
# Update Dash0Monitoring to enable Prometheus scraping
kubectl apply -f kubernetes/base/dash0-monitoring.yaml
```

(Already enabled in the current configuration)

### 3. Verify It's Running

```bash
# Check pod is ready
kubectl get pods -n apollo-dash0-demo -l app=postgres-exporter

# Check logs
kubectl logs -f deployment/postgres-exporter -n apollo-dash0-demo

# Port forward and test metrics endpoint
kubectl port-forward svc/postgres-exporter 9187:9187 -n apollo-dash0-demo
curl http://localhost:9187/metrics | head -20
```

### 4. View Metrics in Dash0

1. Go to https://app.dash0.com
2. Select dataset: `apollo-router-demo`
3. Go to **Metrics**
4. Search for: `pg_`

**Note**: First metrics appear after ~5 minutes (slow scrape interval)

## Docker Compose (Local Dev)

### 1. Start Services

```bash
cd docker-compose
docker-compose up -d
```

The postgres-exporter is already configured in `docker-compose.yaml`.

### 2. Verify It's Running

```bash
docker-compose ps postgres-exporter

# Check logs
docker-compose logs -f postgres-exporter
```

### 3. Test Metrics Endpoint

```bash
curl http://localhost:9187/metrics | head -20
```

### 4. View Metrics in Dash0

Same as Kubernetes (see above).

## What Was Enabled

### PostgreSQL Configuration
- ✅ `pg_stat_statements` extension created (detailed query analytics)
- ✅ `dash0_monitor` user created (read-only monitoring)
- ✅ Proper permissions granted (pg_monitor role)

### Prometheus Exporter
- ✅ Deployed on port 9187
- ✅ Annotated for Prometheus discovery:
  - `prometheus.io/scrape: "true"`
  - `prometheus.io/scrape-slow: "true"` (5-minute interval)
  - `prometheus.io/port: "9187"`
  - `prometheus.io/path: "/metrics"`

### Dash0 Operator Integration
- ✅ Prometheus scraping enabled
- ✅ Automatically discovers and scrapes exporter pod
- ✅ Forwards metrics to Dash0

## Test the Connection

### Kubernetes

```bash
# Port forward to PostgreSQL
kubectl port-forward svc/inventory-db-rw 5432:5432 -n apollo-dash0-demo &

# Connect as monitoring user
psql -h localhost -U dash0_monitor -d inventory_db

# Inside psql - list extensions (should show pg_stat_statements)
\dx

# View query statistics
SELECT query, calls, mean_time FROM pg_stat_statements LIMIT 5;

# Exit
\q

# Kill port forward
kill %1
```

### Docker Compose

```bash
# Connect directly to PostgreSQL
psql -h localhost -U dash0_monitor -d inventory_db -p 5432

# Password: dash0_secure_monitor_password

# View query statistics
SELECT query, calls, mean_time FROM pg_stat_statements LIMIT 5;

# Exit
\q
```

## Example Metrics in Dash0

Once data starts flowing, you'll see:

```
pg_stat_statements_calls{...} 42
pg_stat_statements_mean_time{...} 1.25
pg_stat_database_tup_returned{datname="inventory_db"} 1000
pg_stat_database_numbackends{datname="inventory_db"} 5
pg_stat_user_tables_seq_scan{relname="inventory"} 10
pg_stat_user_tables_live_tup{relname="inventory"} 5
```

## Troubleshooting

### "Connection refused" in logs

The PostgreSQL server might still be starting. Wait 30 seconds:

```bash
# Kubernetes
kubectl logs deployment/postgres-exporter -n apollo-dash0-demo

# Docker Compose
docker-compose logs postgres-exporter
```

### No metrics in Dash0 after 5 minutes

1. **Verify Prometheus scraping is enabled**:
   ```bash
   kubectl get dash0monitoring -n apollo-dash0-demo -o yaml | grep prometheus -A 2
   # Should show: enabled: true
   ```

2. **Verify exporter is responding**:
   ```bash
   kubectl port-forward svc/postgres-exporter 9187:9187 -n apollo-dash0-demo
   curl http://localhost:9187/metrics | grep "pg_stat_statements"
   ```

3. **Check exporter logs for errors**:
   ```bash
   kubectl logs deployment/postgres-exporter -n apollo-dash0-demo | tail -20
   ```

## Why Prometheus Exporter?

**vs. OpenTelemetry Collector:**
- ✅ 30-50MB vs. 200-300MB memory
- ✅ Single focused tool
- ✅ Integrates with existing Dash0 Prometheus scraping
- ✅ No additional configuration files needed
- ✅ Faster startup (all configured)

**Query-level detail preserved:**
- ✅ Still get per-query metrics via pg_stat_statements
- ✅ Query call counts
- ✅ Query execution times (mean/min/max)
- ✅ Rows affected per query

## Next Steps

1. **View Dashboards**: Check PostgreSQL metrics in Dash0
2. **Create Alerts**: Set up alerts for performance degradation
3. **Optimize Queries**: Use `pg_stat_statements` to find bottlenecks
4. **Monitor Trends**: Track performance over time
5. **Correlate Data**: Link database metrics with application traces

## Full Documentation

For detailed setup, configuration, and troubleshooting, see:
- [POSTGRESQL_METRICS.md](POSTGRESQL_METRICS.md)

## Files Modified

- `kubernetes/base/postgres-exporter.yaml` - ✨ NEW
- `kubernetes/base/dash0-monitoring.yaml` - Updated (prometheusScraping enabled)
- `shared/subgraphs/inventory/db/init.sql` - Updated (pg_stat_statements + monitoring user)
- `kubernetes/base/postgres-cluster.yaml` - Updated (pg_stat_statements + monitoring user)
- `docker-compose/docker-compose.yaml` - Updated (postgres-exporter service)
