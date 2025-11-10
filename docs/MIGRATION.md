# Project Restructuring: Migration Guide

## What Changed

The project has been reorganized to provide **two clear deployment paths** with a clean separation of concerns.

### Old Structure (Flat)
```
.
├── docker-compose.yaml      # At root
├── kubernetes/                      # K8s files mixed with root
├── router/                   # At root
├── subgraphs/                # At root
├── start.sh                  # At root (handled both deployments)
├── stop.sh                   # At root
└── status.sh                 # At root
```

### New Structure (Organized)
```
.
├── compose/                  # Docker Compose only
│   ├── docker-compose.yaml
│   ├── start.sh
│   └── ...
├── kubernetes/               # Kubernetes only
│   ├── start.sh
│   └── ...
├── shared/                   # Used by both
│   ├── router/
│   └── subgraphs/
```

## What's New

### Clear Deployment Paths

**Choose one path based on your needs:**

1. **Docker Compose** (Local Development)
   - Simple, fast (~1-2 minutes)
   - Location: `compose/`
   - Start: `cd docker-compose && ./start.sh`

2. **Kubernetes (k3d)** (Production-like)
   - Full cluster, Dash0 integration (~5-10 minutes)
   - Location: `kubernetes/`
   - Start: `cd kubernetes && ./start.sh`

### Simplified Docker Compose

The `docker-compose/docker-compose.yaml` now includes only:
- Apollo Router
- 4 Subgraphs
- PostgreSQL

Removed (use Kubernetes if needed):
- Website/Bot (better served separately)
- Vegeta (use scripts instead)

### Unified Start/Stop/Status Scripts

Each deployment path has its own scripts:

```bash
# Docker Compose
cd docker-compose
./start.sh
./stop.sh
./status.sh

# Kubernetes
cd kubernetes
./start.sh
./stop.sh
./status.sh
```

### Shared Configuration

- `.env` remains at project root (shared by both)
- Router config: `shared/router/router.yaml`
- Subgraphs: `shared/subgraphs/`
- Both paths reference these files

## Migration Steps

### If You Had Docker Compose Running

1. **Stop existing services:**
   ```bash
   docker compose down
   ```

2. **Navigate to compose folder:**
   ```bash
   cd docker-compose
   ```

3. **Start with new setup:**
   ```bash
   ./start.sh
   ```

### If You Had k3d Running

1. **Delete old cluster:**
   ```bash
   kubectl delete cluster apollo-dash0-demo --all-namespaces
   # or
   k3d cluster delete apollo-dash0-demo
   ```

2. **Navigate to kubernetes folder:**
   ```bash
   cd kubernetes
   ```

3. **Start with new setup:**
   ```bash
   ./start.sh
   ```

### If You Had Custom Scripts

All scripts in `kubernetes/scripts/` still work the same way. The only change is references to `kubernetes/` have been updated to `kubernetes/`.

## Updated References

### In Scripts

All references have been updated:
- `kubernetes/` → `kubernetes/`
- `router/` → `shared/router/`
- `subgraphs/` → `shared/subgraphs/`

These changes are in:
- `kubernetes/scripts/k3d-up.sh`
- `kubernetes/scripts/rebuild-and-reimport-images.sh`
- `kubernetes/helm-values/router-values.yaml`
- `docker-compose/docker-compose.yaml`

### In Documentation

- New: `docker-compose/README.md` - Compose-specific docs
- New: `kubernetes/README-DEPLOYMENT.md` - Deployment guide
- Updated: `README.md` - Project overview with clear navigation

## What Stayed the Same

- `.env` file location (project root)
- Environment variables
- Router configuration behavior
- Subgraph implementations
- Kubernetes manifests and helm charts
- All observability features
- Database setup

## Benefits

✅ **Clear organization**: You immediately know which path to use
✅ **Reduced confusion**: No mixing of deployment concerns
✅ **Easier maintenance**: Each path has its own docs and scripts
✅ **Better onboarding**: New users see two clear options
✅ **Shared code**: Router and subgraphs use symlinks to avoid duplication

## Questions?

- For Docker Compose: See `docker-compose/README.md`
- For Kubernetes: See `kubernetes/README-DEPLOYMENT.md`
- General questions: Check `README.md`
