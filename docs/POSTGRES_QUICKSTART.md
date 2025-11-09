# PostgreSQL Quick Start Guide

Get the inventory subgraph running with PostgreSQL in minutes.

## Docker Compose (Local Development)

### 1. Start Services
```bash
docker-compose up -d
```

Wait for all services to be healthy:
```bash
docker-compose ps
```

### 2. Verify Database is Ready
```bash
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db -c "SELECT COUNT(*) FROM inventory;"
```

Expected output: `count: 5` (the seeded products)

### 3. Test GraphQL Endpoint
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { product(id: \"1\") { id inventory { quantity warehouse estimatedDelivery } } }"
  }'
```

Expected response:
```json
{
  "data": {
    "product": {
      "id": "1",
      "inventory": {
        "quantity": 15,
        "warehouse": "West Coast",
        "estimatedDelivery": "3-5 days"
      }
    }
  }
}
```

### 4. Run Load Test
```bash
node scripts/inventory-load-test.js 30 5
```

Watch the test output - should see ~99%+ success rate.

## Kubernetes (Production-like)

### 1. Prerequisites
```bash
# Check cluster is running
kubectl cluster-info

# Verify Dash0 is configured
kubectl get secret dash0-auth -n apollo-dash0-demo
```

### 2. Install PostgreSQL Operator (one-time)
```bash
helm repo add cnpg https://cloudnative-pg.io/charts
helm repo update
helm install cnpg cnpg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  --wait
```

### 3. Deploy PostgreSQL Cluster
```bash
kubectl apply -f k8s/base/postgres-cluster.yaml
```

Wait for cluster to be ready:
```bash
kubectl get cluster -n apollo-dash0-demo
# Should show "Ready" status
```

### 4. Deploy Inventory Subgraph
```bash
kubectl apply -f k8s/base/subgraphs/inventory.yaml
```

Check deployment:
```bash
kubectl get deployment inventory -n apollo-dash0-demo
kubectl logs -f deployment/inventory -n apollo-dash0-demo
```

### 5. Verify Database Connectivity
```bash
# Check database pod logs
kubectl logs -f pod/inventory-db-1 -n apollo-dash0-demo

# Verify inventory pod connected successfully
kubectl logs deployment/inventory -n apollo-dash0-demo | grep -i "database\|inventory"
```

### 6. Test from Within Cluster
```bash
# Port forward to router
kubectl port-forward -n apollo-dash0-demo svc/apollo-router 4000:4000 &

# Test GraphQL
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { product(id: \"1\") { id inventory { quantity warehouse } } }"
  }'
```

## Common Tasks

### View Inventory Data
```bash
# Docker Compose
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
SELECT product_id, quantity, warehouse, estimated_delivery FROM inventory ORDER BY product_id;
EOF

# Kubernetes
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db -c "SELECT * FROM inventory;"
```

### View Audit Log
```bash
# Docker Compose
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
SELECT product_id, operation, quantity_before, quantity_after, performed_at
FROM inventory_audit
ORDER BY performed_at DESC
LIMIT 10;
EOF

# Kubernetes
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db -c "SELECT * FROM inventory_audit ORDER BY performed_at DESC LIMIT 10;"
```

### Update Inventory Manually
```bash
# Docker Compose
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db << 'EOF'
UPDATE inventory SET quantity = 100 WHERE product_id = '1';
EOF

# Kubernetes
kubectl exec -it pod/inventory-db-1 -n apollo-dash0-demo -- \
  psql -U inventory_user -d inventory_db -c "UPDATE inventory SET quantity = 100 WHERE product_id = '1';"
```

### Reset Database
```bash
# Docker Compose - remove volumes
docker-compose down -v
docker-compose up -d

# Kubernetes - delete and recreate
kubectl delete cluster inventory-db -n apollo-dash0-demo
kubectl apply -f k8s/base/postgres-cluster.yaml
```

## Performance Testing

### Quick GraphQL Load Test
```bash
# 30 second test with 5 concurrent requests
node scripts/inventory-load-test.js 30 5

# 2 minute test with 20 concurrent requests
node scripts/inventory-load-test.js 120 20
```

### Database Stress Test
```bash
# Docker Compose environment
node scripts/inventory-db-stress-test.js 30 10 localhost 5432

# Kubernetes environment (exec into pod)
kubectl exec -it deployment/inventory -n apollo-dash0-demo -- \
  node scripts/inventory-db-stress-test.js 30 5 inventory-db-rw 5432
```

## Troubleshooting

### "Connection refused" Error
**Problem**: Can't connect to database

**Docker Compose:**
```bash
# Check if postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

**Kubernetes:**
```bash
# Check cluster status
kubectl get cluster inventory-db -n apollo-dash0-demo

# Check pod status
kubectl get pods -n apollo-dash0-demo | grep inventory-db

# Check logs
kubectl logs pod/inventory-db-1 -n apollo-dash0-demo
```

### "Password authentication failed" Error
**Problem**: Wrong credentials

**Docker Compose:**
Credentials in `docker-compose.yaml`:
- User: `inventory_user`
- Password: `inventory_password`
- Database: `inventory_db`

**Kubernetes:**
Credentials in `k8s/base/postgres-cluster.yaml`:
- User: `inventory_user`
- Password: `inventory_password` (from secret)
- Database: `inventory_db`

### GraphQL Queries Returning Null Inventory
**Problem**: Inventory data not being returned

1. Check database has data:
```bash
docker exec apollo-dash0-demo-postgres-1 psql -U inventory_user -d inventory_db -c "SELECT COUNT(*) FROM inventory;"
# Should return: count = 5
```

2. Check inventory service logs:
```bash
docker-compose logs inventory
# Look for "Database connection verified" message
```

3. Restart inventory service:
```bash
docker-compose restart inventory
```

## Next Steps

1. **View in Dash0**: Check traces and metrics for database queries
2. **Run sustained load**: Use Vegeta for hours-long testing
3. **Configure backups**: Set up S3 backups for Kubernetes deployment
4. **Scale up**: Add database replicas for high availability
5. **Tune performance**: Adjust connection pool size and PostgreSQL parameters

## Documentation

- Full documentation: [POSTGRES_SETUP.md](POSTGRES_SETUP.md)
- Migration details: [POSTGRES_MIGRATION_SUMMARY.md](../POSTGRES_MIGRATION_SUMMARY.md)
- Deployment guide: [CLAUDE.md](../CLAUDE.md)

## Need Help?

- Check service logs: `docker-compose logs [service]`
- View database directly: `docker exec -it postgres-1 psql`
- Review database module: `subgraphs/inventory/db/database.js`
- Check Dash0 dashboard for observability data
