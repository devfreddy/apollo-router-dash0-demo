# PostgreSQL Database Setup for Inventory Subgraph

This document describes the PostgreSQL database implementation for the inventory subgraph in the Apollo Router Dash0 Demo.

## Overview

The inventory subgraph has been migrated from in-memory data to PostgreSQL, providing:

- **Persistent Storage**: Inventory data survives service restarts
- **Transaction Support**: ACID guarantees for inventory updates
- **Audit Logging**: Full audit trail of inventory changes
- **Observability**: OpenTelemetry instrumentation for database queries
- **Scalability**: Connection pooling and optimized indexes
- **High Availability**: CloudNativePG operator for Kubernetes deployments

## Architecture

### Database Schema

The inventory database includes two main tables:

#### `inventory` Table
```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  warehouse VARCHAR(255) NOT NULL,
  estimated_delivery VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_inventory_product_id`: Optimized product ID lookups

#### `inventory_audit` Table
```sql
CREATE TABLE inventory_audit (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  warehouse VARCHAR(255),
  operation VARCHAR(50) NOT NULL,
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_inventory_audit_product_id`: Query audit logs by product
- `idx_inventory_audit_performed_at`: Query audit logs by time range

### Initial Data

The database is seeded with the original in-memory inventory data:

```
Product 1: 15 units, West Coast, 3-5 days
Product 2: 42 units, East Coast, 2-4 days
Product 3: 128 units, Midwest, 2-3 days
Product 4: 0 units, West Coast, Out of stock
Product 5: 23 units, East Coast, 3-5 days
```

## Local Development (Docker Compose)

### Starting the Services

```bash
docker-compose up -d
```

This brings up:
- PostgreSQL 15 (port 5432)
- Apollo Router (port 4000)
- All subgraphs including inventory (port 4004)

### Database Access

Connect directly to the database:

```bash
docker exec -it apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db
```

View inventory data:
```sql
SELECT * FROM inventory;
SELECT * FROM inventory_audit ORDER BY performed_at DESC LIMIT 10;
```

### Volume Management

Database data is persisted in a Docker volume named `postgres_data`. To reset the database:

```bash
docker-compose down -v  # Remove volumes
docker-compose up      # Start fresh
```

## Kubernetes Deployment

### Prerequisites

Install CloudNativePG operator:

```bash
# Add Helm repo
helm repo add cnpg https://cloudnative-pg.io/charts
helm repo update

# Install operator
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  --wait
```

### Deploy PostgreSQL Cluster

```bash
kubectl apply -f k8s/base/postgres-cluster.yaml
```

This creates:
- PostgreSQL cluster with 1 instance
- PersistentVolumeClaim (10GB)
- Database and initial schema
- Services for read-write and read-only access

### Monitor Cluster

Check cluster status:

```bash
kubectl get cluster -n apollo-dash0-demo
kubectl describe cluster inventory-db -n apollo-dash0-demo
```

View logs:

```bash
kubectl logs -f pod/inventory-db-1 -n apollo-dash0-demo
```

Connect to database from cluster:

```bash
# Forward port locally
kubectl port-forward -n apollo-dash0-demo svc/inventory-db-rw 5432:5432

# Then in another terminal
psql -h localhost -U inventory_user -d inventory_db
```

### Scaling

To add replicas (for read-heavy workloads):

Edit `k8s/base/postgres-cluster.yaml`:
```yaml
spec:
  instances: 3  # Increase from 1 to 3
```

Apply changes:
```bash
kubectl apply -f k8s/base/postgres-cluster.yaml
```

### Backup and Recovery

The cluster is configured with a 7-day retention policy. To enable S3 backups:

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

Create the AWS credentials secret:

```bash
kubectl create secret generic aws-creds \
  --from-literal=access-key-id=YOUR_AWS_ACCESS_KEY \
  --from-literal=secret-access-key=YOUR_AWS_SECRET_KEY \
  -n apollo-dash0-demo
```

## OpenTelemetry Instrumentation

The inventory subgraph uses `@opentelemetry/instrumentation-pg` to automatically instrument database queries.

### Exported Metrics and Traces

**Traces:**
- Database query execution spans
- Transaction spans (BEGIN/COMMIT/ROLLBACK)
- Error spans with exception details

**Span Attributes:**
- `db.system`: "postgresql"
- `db.operation`: SQL command (SELECT, UPDATE, INSERT, DELETE)
- `db.statement`: SQL query (first 100 characters)
- `db.sql.parameterized`: Whether query used parameters

**Example Query Span:**
```
Span: db.query.select
├── db.system: postgresql
├── db.operation: SELECT
├── db.statement: SELECT product_id, quantity, warehouse...
└── duration: 2.5ms
```

### Viewing in Dash0

Traces and metrics are automatically exported to Dash0 via OTLP HTTP. In the Dash0 dashboard:

1. Navigate to **Traces**
2. Filter by service: `inventory-subgraph`
3. Look for spans with `db.system: postgresql`

## Performance Testing

Three load testing tools are provided:

### 1. GraphQL Load Test

Tests the inventory subgraph through the Apollo Router:

```bash
# Default: 60s, 10 concurrent requests
node scripts/inventory-load-test.js

# Custom: 120s, 20 concurrent requests
node scripts/inventory-load-test.js 120 20

# Against remote endpoint
node scripts/inventory-load-test.js 60 5 http://prod-router:4000
```

**Operations:**
- 60% random product inventory reads
- 30% multi-product reads
- 10% simulated mutations

**Output:**
```
📊 INVENTORY LOAD TEST RESULTS
============================================================
📈 Test Configuration:
  Duration: 60s
  Concurrency: 10 workers
  Endpoint: http://localhost:4000/graphql

📊 Results:
  Total Requests: 2500
  Successful: 2475 (99.0%)
  Failed: 25
  Requests/sec: 41.67

⏱️ Response Times:
  Min: 15ms
  Max: 250ms
  Avg: 24ms
```

### 2. Database Stress Test

Direct database testing, bypassing GraphQL layer:

```bash
# Default: 60s, 10 concurrent operations
node scripts/inventory-db-stress-test.js

# Custom configuration
node scripts/inventory-db-stress-test.js 120 20 localhost 5432

# In Kubernetes
kubectl exec -it deployment/inventory -n apollo-dash0-demo -- \
  node /app/scripts/inventory-db-stress-test.js 60 5 inventory-db-rw 5432
```

**Operations:**
- 50% SELECT queries
- 30% UPDATE with transactions
- 10% DELETE operations
- 10% INSERT to audit log

**Output:**
```
📊 DATABASE STRESS TEST RESULTS
======================================================================
⚙️  Test Configuration:
  Duration: 60s
  Concurrency: 10 workers
  Database: inventory_user@localhost:5432/inventory_db

📈 Results:
  Total Operations: 5000
  Successful: 4950 (99.0%)
  Failed: 50
  Operations/sec: 83.33

📊 Operation Breakdown:
  read:   2500 (50.0%)
  update: 1500 (30.0%)
  delete:  500 (10.0%)
  insert:  500 (10.0%)

⏱️ Response Times:
  Min: 1ms
  Max: 150ms
  Avg: 12ms
```

### 3. Vegeta HTTP Load Generator

HTTP-level load testing for sustained testing:

```bash
# Create targets file
cat > vegeta/inventory-targets.txt << 'EOF'
GET http://localhost:4000/graphql
EOF

# Run Vegeta
vegeta attack -targets=vegeta/inventory-targets.txt -rate=100 -duration=60s | vegeta report

# Using Docker Compose profile
docker-compose --profile load-testing up
```

## Database Operations

### Adding a New Product to Inventory

```bash
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
INSERT INTO inventory (product_id, quantity, warehouse, estimated_delivery)
VALUES ('6', 50, 'Central', '2-3 days');
EOF
```

### Updating Inventory Quantity

```bash
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
UPDATE inventory
SET quantity = 100, updated_at = CURRENT_TIMESTAMP
WHERE product_id = '1';
EOF
```

### Clearing Audit Log

```bash
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
DELETE FROM inventory_audit
WHERE performed_at < NOW() - INTERVAL '30 days';
EOF
```

## Troubleshooting

### Connection Issues

**Error: "connect ECONNREFUSED 127.0.0.1:5432"**

PostgreSQL container is not running:
```bash
docker-compose ps postgres
docker-compose up -d postgres
```

**Error: "password authentication failed"**

Check credentials in docker-compose.yaml or environment variables:
```bash
docker-compose config | grep DATABASE_
```

### Query Performance Issues

Check slow queries:

```sql
-- In PostgreSQL
SELECT * FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Or from logs
docker-compose logs postgres | grep "duration:"
```

### Database Connection Pooling

Monitor connection pool status:

```bash
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
SELECT datname, count(*) as connections
FROM pg_stat_activity
GROUP BY datname;
EOF
```

Adjust pool size in docker-compose.yaml:
```yaml
environment:
  - DATABASE_POOL_SIZE=20  # Increase from 10
```

## Best Practices

### 1. Regular Backups

Kubernetes (automatic with CloudNativePG):
- 7-day retention (configurable)
- Enable S3 backups for long-term storage

Docker Compose (manual):
```bash
docker exec apollo-dash0-demo-postgres-1 pg_dump -U inventory_user -d inventory_db > backup.sql
```

### 2. Monitor Query Performance

Enable query logging in postgres-cluster.yaml:
```yaml
parameters:
  log_statement: "all"
  log_duration: "on"
```

### 3. Index Management

Key indexes are created in initialization:
- `product_id` for fast lookups
- `performed_at` for audit log time-range queries

Add more indexes if needed:
```sql
CREATE INDEX idx_inventory_warehouse ON inventory(warehouse);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);
```

### 4. Audit Log Cleanup

Archive old audit logs periodically:
```bash
# Archive to cold storage
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
DELETE FROM inventory_audit
WHERE performed_at < NOW() - INTERVAL '90 days';
EOF
```

### 5. Observability

- Monitor database metrics in Dash0
- Check query response times via OpenTelemetry spans
- Track error rates per operation
- Alert on connection pool exhaustion

## Migration Guide

### From In-Memory to PostgreSQL

If you had the old in-memory version:

1. **Stop inventory service**
   ```bash
   docker-compose stop inventory
   ```

2. **Start PostgreSQL**
   ```bash
   docker-compose up -d postgres
   ```

3. **Restart inventory service**
   ```bash
   docker-compose up -d inventory
   ```

The database will be automatically initialized with seed data.

## Related Documentation

- [Database Module](../subgraphs/inventory/db/database.js)
- [Inventory Subgraph](../subgraphs/inventory/index.js)
- [CloudNativePG Documentation](https://cloudnative-pg.io/)
- [OpenTelemetry PostgreSQL Instrumentation](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-pg)
