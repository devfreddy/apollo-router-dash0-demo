# PostgreSQL Documentation Index

Complete PostgreSQL documentation for the inventory subgraph.

## Documentation Guide

### 📋 Overview & Planning
- **[POSTGRES_MIGRATION_SUMMARY.md](../POSTGRES_MIGRATION_SUMMARY.md)** ⭐ **Start here**
  - What changed during migration
  - Complete file listing of changes
  - Data migration details
  - Performance characteristics

### 🚀 Quick Start
- **[POSTGRES_QUICKSTART.md](POSTGRES_QUICKSTART.md)** ⭐ **New to PostgreSQL? Start here**
  - 5-minute Docker Compose setup
  - 10-minute Kubernetes setup
  - Common tasks (view data, test, reset)
  - Quick troubleshooting

### 📚 Comprehensive Guides

#### Local Development
- **[POSTGRES_SETUP.md](POSTGRES_SETUP.md)** - Complete PostgreSQL setup guide
  - Database schema documentation
  - Docker Compose setup & usage
  - Database operations
  - Performance monitoring
  - Best practices

#### Kubernetes Deployment
- **[KUBERNETES_POSTGRES_INTEGRATION.md](KUBERNETES_POSTGRES_INTEGRATION.md)** - Kubernetes integration details
  - How PostgreSQL integrates with k3d-up.sh
  - CloudNativePG operator setup
  - Management script usage
  - Resource requirements
  - HA and backup configuration

- **[KUBERNETES_INTEGRATION_SUMMARY.md](KUBERNETES_INTEGRATION_SUMMARY.md)** - Kubernetes integration overview
  - Single-command deployment
  - Management commands
  - Resource usage
  - Deployment workflow

### 🛠️ Operations & Management

#### Docker Compose
```bash
# Start everything
docker-compose up -d

# Access database
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db

# View data
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db \
  -c "SELECT * FROM inventory;"

# Run load test
node scripts/inventory-load-test.js 30 5
```

#### Kubernetes
```bash
# Deploy everything
./kubernetes/scripts/k3d-up.sh

# Manage PostgreSQL
./kubernetes/scripts/manage-postgres.sh [status|logs|connect|port-forward|restart|reset-data]

# Verify integration
./kubernetes/scripts/verify-postgres-integration.sh

# View data
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db -c "SELECT * FROM inventory;"
```

### 📊 Database Schema

#### inventory Table
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

#### inventory_audit Table
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

### 🔧 Seed Data

Five products are automatically seeded:

| Product ID | Quantity | Warehouse | Delivery |
|----------|----------|-----------|----------|
| 1 | 15 | West Coast | 3-5 days |
| 2 | 42 | East Coast | 2-4 days |
| 3 | 128 | Midwest | 2-3 days |
| 4 | 0 | West Coast | Out of stock |
| 5 | 23 | East Coast | 3-5 days |

### 📈 Load Testing

#### GraphQL Load Test (through Apollo Router)
```bash
# Default: 60s, 10 concurrent requests
node scripts/inventory-load-test.js

# Custom: 120s, 20 concurrent
node scripts/inventory-load-test.js 120 20

# Against production endpoint
node scripts/inventory-load-test.js 60 5 http://prod-router:4000
```

#### Database Stress Test (direct)
```bash
# Docker Compose
node scripts/inventory-db-stress-test.js 60 10 localhost 5432

# Kubernetes
kubectl exec -it deployment/inventory -n apollo-dash0-demo -- \
  node scripts/inventory-db-stress-test.js 60 5 inventory-db-rw 5432
```

### 🔍 Monitoring & Observability

#### Kubernetes Cluster Status
```bash
./kubernetes/scripts/manage-postgres.sh status
```

#### Database Logs
```bash
./kubernetes/scripts/manage-postgres.sh logs
```

#### Connect to Database
```bash
./kubernetes/scripts/manage-postgres.sh connect
```

#### Dash0 Integration
1. Navigate to Dash0 dashboard
2. Filter by dataset: `${DASH0_DATASET}`
3. View traces for `inventory-subgraph`
4. Look for spans with `db.system: postgresql`

### ⚙️ Configuration

#### Environment Variables
```bash
# Docker Compose (automatically set)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=inventory_db
DATABASE_USER=inventory_user
DATABASE_PASSWORD=inventory_password
DATABASE_POOL_SIZE=10

# Kubernetes (from kubernetes/base/subgraphs/inventory.yaml)
# Sourced from: inventory-db-credentials secret
```

#### CloudNativePG Parameters
See [POSTGRES_SETUP.md](POSTGRES_SETUP.md#troubleshooting) for:
- Backup configuration
- Performance tuning
- High availability setup
- Query logging

### 🆘 Troubleshooting

#### Docker Compose Issues
```bash
# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres

# Reset data
docker-compose down -v
docker-compose up -d
```

#### Kubernetes Issues
```bash
# Check cluster status
./kubernetes/scripts/manage-postgres.sh status

# View logs
./kubernetes/scripts/manage-postgres.sh logs

# Reset database
./kubernetes/scripts/manage-postgres.sh reset-data
```

See [POSTGRES_SETUP.md#troubleshooting](POSTGRES_SETUP.md#troubleshooting) for detailed troubleshooting.

### 📝 Related Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Deployment reference with PostgreSQL commands
- **[POSTGRES_MIGRATION_SUMMARY.md](../POSTGRES_MIGRATION_SUMMARY.md)** - Migration details
- **[subgraphs/inventory/db/database.js](../subgraphs/inventory/db/database.js)** - Database module source
- **[subgraphs/inventory/db/init.sql](../subgraphs/inventory/db/init.sql)** - Schema definition

### 🚀 Quick Reference Commands

| Task | Command |
|------|---------|
| Deploy (Docker) | `docker-compose up -d` |
| Deploy (K8s) | `./kubernetes/scripts/k3d-up.sh` |
| Verify integration | `./kubernetes/scripts/verify-postgres-integration.sh` |
| View data | `./kubernetes/scripts/manage-postgres.sh connect` |
| View logs | `./kubernetes/scripts/manage-postgres.sh logs` |
| Restart DB | `./kubernetes/scripts/manage-postgres.sh restart` |
| Reset data | `./kubernetes/scripts/manage-postgres.sh reset-data` |
| Test GraphQL | `node scripts/inventory-load-test.js` |
| Stress test DB | `node scripts/inventory-db-stress-test.js` |

### 📚 External Resources

- [CloudNativePG Documentation](https://cloudnative-pg.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [OpenTelemetry PostgreSQL](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/plugins/node/opentelemetry-instrumentation-pg)

---

## Document Selection Guide

**Choose your document based on what you need:**

```
What do I need?
    ↓
    ├─ "I'm new to this setup"
    │  └─ → POSTGRES_QUICKSTART.md
    │
    ├─ "I want to understand what changed"
    │  └─ → POSTGRES_MIGRATION_SUMMARY.md (root directory)
    │
    ├─ "I'm setting up locally (Docker Compose)"
    │  └─ → POSTGRES_SETUP.md
    │
    ├─ "I'm deploying to Kubernetes"
    │  └─ → KUBERNETES_POSTGRES_INTEGRATION.md
    │
    ├─ "I want an overview of Kubernetes changes"
    │  └─ → KUBERNETES_INTEGRATION_SUMMARY.md
    │
    ├─ "I need to manage the database"
    │  └─ → ./kubernetes/scripts/manage-postgres.sh --help
    │
    └─ "I need deployment reference"
       └─ → CLAUDE.md
```

---

**Last Updated**: November 2024
**Status**: Production Ready ✅
