# Kubernetes Restart Scripts

Quick reference for restarting your Apollo Router stack in Kubernetes.

## Scripts Overview

### 1. `./kubernetes/scripts/restart.sh` - Full Restart (2-3 minutes) ⭐ RECOMMENDED
**Use this when:**
- You changed .env variables (token, endpoints)
- You changed operator configuration
- You changed any configuration and want full control
- You want everything fresh

**What it does:**
1. Updates Dash0 secret with token from .env
2. Updates ConfigMap with endpoints and config from .env
3. Restarts Dash0 operator (re-instruments all pods)
4. Restarts all deployments (router + subgraphs)
5. Waits for everything to be healthy

```bash
./kubernetes/scripts/restart.sh
```

### 2. `./kubernetes/scripts/quick-restart.sh` - Fast Restart (30-60 seconds)
**Use this when:**
- You only changed application code (not config)
- You changed OTLP headers in otel.js files
- You just want to roll out new code
- You need the fastest restart

**What it does:**
1. Restarts all deployments in apollo-dash0-demo namespace
2. Waits for rollout to complete

```bash
./kubernetes/scripts/quick-restart.sh
```

### 3. `./kubernetes/scripts/k3d-up.sh` - Full Cluster Deploy (10+ minutes)
**Use this when:**
- Starting from scratch
- Cluster doesn't exist yet
- You need to rebuild everything
- First-time setup

```bash
./kubernetes/scripts/k3d-up.sh
```

### 4. `./kubernetes/scripts/k3d-down.sh` - Destroy Cluster
**Use this when:**
- You want to completely tear down the cluster
- Freeing up resources

```bash
./kubernetes/scripts/k3d-down.sh
```

## Comparison

| Script | Time | What | When |
|--------|------|------|------|
| **restart.sh** | 2-3 min | Everything + operator | Config changes, .env updates |
| **quick-restart.sh** | 30-60 sec | Apps only | Code changes, otel.js updates |
| **k3d-up.sh** | 10+ min | Full cluster | First deploy, cluster gone |
| **k3d-down.sh** | 1-2 min | Destroy | Cleanup |

## Common Scenarios

### Scenario 1: Changed .env (token, endpoints)
```bash
./kubernetes/scripts/restart.sh
```
The script sources .env and updates the Secrets/ConfigMaps.

### Scenario 2: Updated OTLP headers (Dash0-Dataset)
```bash
./kubernetes/scripts/quick-restart.sh
```
Since code changes are in otel.js files, just restart the apps.

### Scenario 3: Changed router/router.yaml config
```bash
./kubernetes/scripts/quick-restart.sh
```
ConfigMap is already mounted, restart to pick up new config.

### Scenario 4: Want to completely rebuild
```bash
./kubernetes/scripts/k3d-down.sh
./kubernetes/scripts/k3d-up.sh
```
Or just run k3d-up.sh which checks if cluster exists first.

## What Gets Restarted

### Full Restart (restart.sh)
- ✅ Dash0 secret
- ✅ ConfigMap
- ✅ Dash0 operator
- ✅ Apollo Router
- ✅ All subgraphs
- ✅ Operator re-instruments pods

### Quick Restart (quick-restart.sh)
- ✅ Apollo Router
- ✅ Accounts subgraph
- ✅ Products subgraph (Python)
- ✅ Reviews subgraph
- ✅ Inventory subgraph
- ❌ Operator (not restarted)

## Example Workflow

```bash
# 1. Make changes to otel.js files
vim subgraphs/accounts/otel.js

# 2. Quick restart to pick up changes
./kubernetes/scripts/quick-restart.sh

# 3. Verify with logs
kubectl logs -f deployment/accounts -n apollo-dash0-demo

# 4. Send test query
curl -X POST http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}'

# 5. Check Dash0
# https://app.dash0.com → Logs/Metrics → Filter by gtm-dash0
```

## Helpful kubectl Commands

While scripts are running:

```bash
# Watch pod status
kubectl get pods -n apollo-dash0-demo -w

# View logs of a pod
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo

# Check all deployments status
kubectl rollout status deployment --all -n apollo-dash0-demo

# Describe a deployment
kubectl describe deployment apollo-router -n apollo-dash0-demo

# Get events (for debugging)
kubectl get events -n apollo-dash0-demo --sort-by='.lastTimestamp'
```

## Troubleshooting

### Pods stuck in `Pending` state
```bash
# Check node resources
kubectl top nodes
kubectl describe node <node-name>
```

### Pod keeps restarting
```bash
# Check logs
kubectl logs -f <pod-name> -n apollo-dash0-demo --previous
```

### ConfigMap changes not picked up
```bash
# ConfigMaps need pod restart to take effect
./kubernetes/scripts/quick-restart.sh
```

### Need to see what changed
```bash
# View current config in cluster
kubectl get secret dash0-auth -n apollo-dash0-demo -o jsonpath='{.data.token}' | base64 -d
kubectl get configmap apollo-config -n apollo-dash0-demo -o yaml
```

## Time Estimates

- `quick-restart.sh`: 30-60 seconds
- `restart.sh`: 2-3 minutes
- `k3d-up.sh`: 10-15 minutes (first run), 5-10 minutes (cluster exists)
- `k3d-down.sh`: 1-2 minutes

## Default Timeouts

- Operator: 120 seconds
- Deployments: 180 seconds
- kubectl wait: 60 seconds

If scripts timeout, it usually means something is still starting. Wait a bit and check:

```bash
kubectl get pods -n apollo-dash0-demo
kubectl get pods -n dash0-system
```

## Notes

- Scripts are idempotent (safe to run multiple times)
- `.env` file is required (copy from `.env.sample`)
- Cluster must be running for restart scripts to work
- Operator needs 2-5 minutes after restart to instrument pods
