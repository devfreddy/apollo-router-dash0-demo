# Guidance for AI Assistance

## Documentation Philosophy
- Minimize documentation generation - keep what exists concise
- Distinguish between LLM context needs and user-facing docs
- Keep reference materials in `/docs`, deployment guides in deployment directories

## Project Structure
```
/docker-compose/       # Docker Compose environment (local dev)
/kubernetes/           # Kubernetes manifests, Helm, scripts (k3d, production)
/shared/               # Shared resources (router, subgraphs, database schemas)
/docs/                 # User-facing documentation
```

## Key File Locations
| Component | Path |
|-----------|------|
| Docker Compose | `docker-compose/docker-compose.yaml` |
| Kubernetes setup | `kubernetes/start.sh` |
| Kubernetes status | `kubernetes/status.sh` |
| Router config | `shared/router/router.yaml` |
| Supergraph schema | `shared/router/supergraph.graphql` |
| Helm values | `kubernetes/helm-values/router-values.yaml` |
| Inventory database init | `shared/subgraphs/inventory/db/init.sql` |
| Database management | `kubernetes/scripts/manage-postgres.sh` |

## Essential Scripts
| Task | Command | Duration |
|------|---------|----------|
| Start Kubernetes cluster | `./kubernetes/start.sh` | ~2-3 min |
| Stop Kubernetes cluster | `./kubernetes/stop.sh` | ~10 sec |
| Delete Kubernetes cluster | `./kubernetes/scripts/k3d-down.sh` | ~5 sec |
| Start Docker Compose | `cd docker-compose && docker-compose up -d` | ~30 sec |
| Stop Docker Compose | `cd docker-compose && docker-compose down` | ~5 sec |
| Restart router only | `./kubernetes/scripts/redeploy-router.sh` | ~20-30 sec |
| Restart all apps | `./kubernetes/scripts/redeploy-apps.sh` | ~30-60 sec |
| Check Kubernetes status | `./kubernetes/status.sh` | ~5 sec |
| Check Compose status | `cd docker-compose && docker-compose ps` | ~2 sec |
| View router logs | `kubectl logs -f deployment/apollo-router -n apollo-dash0-demo` | - |

## Important Considerations
- `.env` file contains `DASH0_DATASET`, `DASH0_AUTH_TOKEN`, `DASH0_METRICS_ENDPOINT`, `DASH0_TRACES_ENDPOINT`
- ConfigMaps are managed by deployment scripts (auto-generated from `.env` and configs)
- Router uses OTLP exporters for telemetry (traces + metrics)
- PostgreSQL in Kubernetes uses CloudNativePG operator

## Common Development Workflows

**Modifying router configuration:**
1. Edit `shared/router/router.yaml`
2. Run `./kubernetes/scripts/update-configmap.sh` (if using Kubernetes)
3. Run `./kubernetes/scripts/redeploy-router.sh` to apply

**Modifying supergraph schema:**
1. Edit `shared/router/supergraph.graphql`
2. Run `./kubernetes/scripts/update-configmap.sh` (if using Kubernetes)
3. Run `./kubernetes/scripts/redeploy-router.sh` to apply

**Modifying subgraph code:**
1. Edit subgraph code (e.g., `shared/subgraphs/accounts/`)
2. For Kubernetes: Run `./kubernetes/scripts/rebuild-and-reimport-images.sh`
3. For Compose: Run `cd docker-compose && docker-compose up --build`

**Updating environment variables:**
1. Edit `.env`
2. Run `./kubernetes/scripts/update-configmap.sh` (applies to all ConfigMaps)
3. Restart affected services

## For Detailed Guides
- Docker Compose setup: `docker-compose/README.md`
- Kubernetes deployment: `kubernetes/README.md`
- All deployment commands: `docs/DEPLOYMENT_REFERENCE.md`
- Database setup: `docs/POSTGRES_SETUP.md`
- Troubleshooting: `docs/LOGS.md`
- Dash0 operator details: `kubernetes/DASH0-OPERATOR.md`
