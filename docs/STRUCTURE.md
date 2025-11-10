# Project Structure Guide

This document explains the new project organization and how to navigate it.

## Quick Navigation

```
compose/          → For local development with Docker Compose
kubernetes/       → For production-like K8s deployment (k3d)
shared/           → Used by both (router config + subgraphs)
```

## The Two Deployment Paths

### 1. Docker Compose (compose/)

**For:** Quick local development and testing
**Time:** ~1-2 minutes to start
**Complexity:** Low

```bash
cd docker-compose
./start.sh      # Start services
./status.sh     # Check status
./stop.sh       # Stop services
```

**What's included:**
- Apollo Router (port 4000)
- 4 Subgraphs (ports 4001-4004)
- PostgreSQL (port 5432)

**Documentation:** [docker-compose/README.md](docker-compose/README.md)

### 2. Kubernetes (kubernetes/)

**For:** Production-like evaluation with Dash0 observability
**Time:** ~5-10 minutes to setup
**Complexity:** Medium

```bash
cd kubernetes
./start.sh      # Initialize cluster
./status.sh     # Check cluster status
./stop.sh       # Tear down cluster
```

**What's included:**
- Full k3d Kubernetes cluster
- CloudNativePG replicated PostgreSQL
- Dash0 operator with auto-instrumentation
- Helm-deployed Apollo Router
- All observability features

**Documentation:** [kubernetes/README-DEPLOYMENT.md](kubernetes/README-DEPLOYMENT.md)

## Shared Resources (shared/)

Both deployment paths use the same:
- Router configuration: `shared/router/router.yaml`
- Supergraph schema: `shared/router/supergraph.graphql`
- All subgraph code: `shared/subgraphs/`

This ensures consistency across deployments and eliminates code duplication.

## Root Level Files

### Guides
- `start.sh` - Shows deployment options
- `stop.sh` - Shows deployment options
- `status.sh` - Shows deployment options

### Configuration
- `.env` - Environment variables (shared by both paths)
- `.env.sample` - Template with all options

### Full-Featured Demo
- `docker-compose.yaml` - Includes website and bot (for Willful Waste demo)

### Documentation
- `README.md` - Main project overview
- `MIGRATION.md` - Explains what changed
- `STRUCTURE.md` - This file
- `CLAUDE.md` - AI assistant guidelines

## File Locations Reference

| Purpose | Location |
|---------|----------|
| **Compose Setup** | `compose/` |
| **Kubernetes Setup** | `kubernetes/` |
| **Router Config** | `shared/router/router.yaml` |
| **Supergraph Schema** | `shared/router/supergraph.graphql` |
| **Subgraph Source** | `shared/subgraphs/*/` |
| **K8s Manifests** | `kubernetes/base/` |
| **Helm Values** | `kubernetes/helm-values/` |
| **K8s Scripts** | `kubernetes/scripts/` |
| **Dashboards** | `dashboards/` |
| **Documentation** | `docs/` |
| **Infrastructure** | `terraform/` |

## Making Changes

### Modifying Router Configuration

1. Edit `shared/router/router.yaml`
2. **Docker Compose:** Auto-loads on restart
3. **Kubernetes:** Requires ConfigMap update
   ```bash
   cd kubernetes
   ./scripts/update-configmap.sh
   ./scripts/redeploy-router.sh
   ```

### Modifying Subgraph Code

1. Edit code in `shared/subgraphs/<subgraph>/`
2. **Docker Compose:**
   ```bash
   docker compose up -d --build <subgraph>
   ```
3. **Kubernetes:**
   ```bash
   cd kubernetes
   ./scripts/rebuild-and-reimport-images.sh
   ```

### Adding a New Subgraph

1. Create directory: `shared/subgraphs/<new-subgraph>/`
2. Implement Federation GraphQL service
3. **Docker Compose:** Add service to `docker-compose/docker-compose.yaml`
4. **Kubernetes:** Create manifest in `kubernetes/base/subgraphs/`

## Environment Variables

All variables in `.env` are shared and used by both paths:
- `DASH0_AUTH_TOKEN` - For observability
- `DASH0_DATASET` - Dash0 dataset ID
- `DASH0_REGION` - Dash0 region (us, eu)
- Etc.

## Key Decisions

### Why Two Paths?
- **Clarity:** Users immediately know which to choose
- **Simplicity:** No complex conditionals in scripts
- **Maintainability:** Each path has focused documentation
- **Flexibility:** Can evolve independently

### Why Shared?
- **DRY:** Single source of truth for router and subgraphs
- **Consistency:** Same code runs in both environments
- **Efficiency:** No duplication to maintain

### Why Keep Root docker-compose.yaml?
- **Website Demo:** Willful Waste retail demo needs it
- **Backwards Compatibility:** Existing scripts reference it
- **Convenience:** Easy for full-featured testing

## Common Tasks

### Switch Between Deployments
```bash
# Stop one
cd docker-compose && ./stop.sh

# Start another
cd kubernetes && ./start.sh
```

### View Logs
```bash
# Docker Compose
docker-compose logs -f router

# Kubernetes
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo
```

### Access Database
```bash
# Docker Compose
psql -h localhost -U inventory_user -d inventory_db

# Kubernetes
./kubernetes/scripts/manage-postgres.sh connect
```

## Troubleshooting

### Unsure which path to use?
- **Quick testing:** Use Docker Compose (`compose/`)
- **Production evaluation:** Use Kubernetes (`kubernetes/`)
- **Full demo with website:** Use root `docker-compose.yaml`

### Changes not taking effect?
- **Compose:** Services auto-reload on file changes, or restart manually
- **Kubernetes:** ConfigMaps need explicit updates via scripts

### Port conflicts?
Stop all services:
```bash
compose/./stop.sh
kubernetes/./stop.sh
docker compose down
```

## See Also

- [Project README](README.md) - Overview and quick start
- [Migration Guide](MIGRATION.md) - What changed and why
- [Compose Docs](docker-compose/README.md) - Docker Compose details
- [Kubernetes Docs](kubernetes/README-DEPLOYMENT.md) - K8s deployment guide
