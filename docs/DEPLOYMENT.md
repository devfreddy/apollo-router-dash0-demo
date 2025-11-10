# Deployment Guide

This document provides a quick reference for deploying the Apollo Router + Dash0 demo.

## Deployment Options

### Docker Compose
**Best for**: Local development, quick testing, debugging

**Pros**:
- Fastest startup time (~30 seconds)
- Simple logs access
- Direct port mapping
- Easy to modify and iterate

**Cons**:
- Not representative of production
- No Kubernetes features

**Commands**:
```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f router
```

### k3d (Kubernetes)
**Best for**: Production testing, Helm chart validation, Kubernetes learning

**Pros**:
- Production-like environment
- Tests Helm chart configuration
- Kubernetes service discovery
- Namespace isolation
- Official Apollo Router Helm chart

**Cons**:
- Slower startup (~3 minutes)
- Requires more resources
- More complex troubleshooting

**Commands**:
```bash
# Deploy
./kubernetes/scripts/k3d-up.sh

# Tear down
./kubernetes/scripts/k3d-down.sh

# View logs
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo

# View all resources
kubectl get all -n apollo-dash0-demo
```

## Switching Between Environments

Use the environment switcher script:

```bash
# Check what's currently running
./scripts/switch-env.sh status

# Switch to Docker Compose
./scripts/switch-env.sh compose

# Switch to k3d
./scripts/switch-env.sh k3d
```

## Testing the Deployment

Once deployed (either method), test with:

```bash
# Health check
curl http://localhost:4000/health

# Simple query
curl -X POST http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ topProducts { id name price } }"}'

# Federated query (tests all subgraphs)
curl -X POST http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ topProducts { id name price inventory { quantity warehouse } reviews { rating body author { username } } } }"}'
```

## Architecture Comparison

### Docker Compose Architecture
```
Host Machine
├── Docker Engine
    ├── Router Container :4000
    ├── Accounts Container :4001
    ├── Products Container :4003
    ├── Reviews Container :4002
    └── Inventory Container :4004
```

### k3d Architecture
```
Host Machine
├── k3d Cluster (in Docker)
    └── Kubernetes
        └── Namespace: apollo-dash0-demo
            ├── Deployment: apollo-router (Helm)
            │   └── Pod: apollo-router-xxx
            ├── Deployment: accounts
            │   └── Pod: accounts-xxx
            ├── Deployment: products
            │   └── Pod: products-xxx
            ├── Deployment: reviews
            │   └── Pod: reviews-xxx
            ├── Deployment: inventory
            │   └── Pod: inventory-xxx
            ├── Service: apollo-router (LoadBalancer)
            ├── Service: accounts-service (ClusterIP)
            ├── Service: products-service (ClusterIP)
            ├── Service: reviews-service (ClusterIP)
            ├── Service: inventory-service (ClusterIP)
            ├── ConfigMap: apollo-config
            ├── ConfigMap: supergraph-schema
            └── Secret: dash0-auth
```

## Configuration Files

### Docker Compose
- Main: `docker-compose.yaml`
- Router config: `router/router.yaml`
- Supergraph: `router/supergraph.graphql`
- Environment: `.env`

### k3d
- Helm values: `kubernetes/helm-values/router-values.yaml`
- Subgraph manifests: `kubernetes/base/subgraphs/*.yaml`
- Supergraph: Auto-generated from Docker Compose services, then converted for k8s DNS
- Environment: ConfigMaps and Secrets (created from `.env`)

## Troubleshooting

### Docker Compose

**Problem**: Port 4000 already in use
```bash
# Stop k3d first
./kubernetes/scripts/k3d-down.sh
# Then start Docker Compose
docker compose up -d
```

**Problem**: Services not healthy
```bash
docker compose ps
docker compose logs <service-name>
```

### k3d

**Problem**: Port 4000 already in use
```bash
# Stop Docker Compose first
docker compose down
# Then deploy k3d
./kubernetes/scripts/k3d-up.sh
```

**Problem**: Pods not starting
```bash
# Check pod status
kubectl get pods -n apollo-dash0-demo

# Describe problem pod
kubectl describe pod <pod-name> -n apollo-dash0-demo

# View pod logs
kubectl logs <pod-name> -n apollo-dash0-demo
```

**Problem**: Router can't reach subgraphs
- Check that all subgraph pods are running
- Verify service endpoints are correct
- Ensure supergraph schema uses correct k8s DNS names (e.g., `accounts-service.apollo-dash0-demo.svc.cluster.local:4001`)

## Resource Usage

### Docker Compose
- **Memory**: ~1.5 GB
- **CPU**: Moderate
- **Disk**: ~500 MB (images)

### k3d
- **Memory**: ~2.5 GB
- **CPU**: Moderate-High
- **Disk**: ~1 GB (images + cluster)

## Next Steps

After deployment:
1. Test GraphQL queries
2. Generate load with Vegeta (Docker Compose: `--profile load-testing`)
3. View metrics and traces in Dash0
4. Explore Apollo Sandbox at `http://localhost:4000`
