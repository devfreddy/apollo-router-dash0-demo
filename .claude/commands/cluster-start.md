# Deploy Command

Start the Apollo Router demo with either Kubernetes (k3d) or Docker Compose.

## What This Command Does

This command intelligently starts your Apollo Router + Dash0 demo in your preferred deployment mode.

**Default - Kubernetes (k3d):**
1. Stop Docker Compose if it's running
2. Check Docker Desktop availability (prefers Docker Desktop over Colima on macOS)
3. Start the k3d cluster or create it if it doesn't exist
4. Deploy all services with Helm and Kustomize
5. Configure Dash0 monitoring

**Docker Compose Mode:**
1. Stop k3d if it's running
2. Start all services with Docker Compose
3. Compose the supergraph schema
4. Start the Apollo Router

## How It Works

### Default: Kubernetes (k3d)

```
./start.sh
```

Recommended for production-like testing with:
- Full Kubernetes orchestration
- Advanced networking and service management
- Dash0 operator integration
- Better resource isolation

The script will:
- Prefer Docker Desktop on macOS, fall back to Colima if needed
- Create or start the k3d cluster
- Deploy all services automatically

### Docker Compose Mode

```
./start.sh compose
```

Lightweight local development with:
- Simpler single-machine deployment
- Faster startup time
- Lower resource requirements
- Good for rapid iteration

## Requirements

### Both Modes:
- Docker Desktop (macOS) or Colima (macOS/Linux)
- `.env` file with Dash0 credentials configured

### Kubernetes Mode:
- k3d, kubectl, and helm installed
- Sufficient disk space and memory

### Docker Compose Mode:
- Docker Compose (bundled with Docker Desktop)
- (Optional) Rover CLI for schema composition

## Example Usage

```bash
# Start Kubernetes (default, recommended)
./start.sh

# Start Docker Compose
./start.sh compose

# Check deployment status
./status.sh

# Stop everything
./stop.sh

# Stop only Kubernetes
./stop.sh k8s

# Stop only Docker Compose
./stop.sh compose
```

## Important Notes

- **Default is Kubernetes**: Kubernetes is the recommended default mode
- **Automatic cleanup**: Whichever mode you're NOT using will be stopped automatically
- **Docker Desktop priority**: On macOS, Docker Desktop is preferred over Colima
- **First run**: Initial setup takes 2-3 minutes. Subsequent starts are much faster.
- **Fresh Setup**: First run requires `.env` with Dash0 credentials

## Troubleshooting

If deployment fails:
- Ensure Docker/Colima is running: `colima status` or check Docker Desktop
- Verify `.env` has valid Dash0 credentials
- Check logs:
  - **Kubernetes**: `kubectl logs -f deployment/apollo-router -n apollo-dash0-demo`
  - **Docker Compose**: `docker compose logs -f`
- Run `./status.sh` to see current deployment state
- Ensure sufficient disk space and memory available

## Related Scripts

- `./status.sh` - Check deployment status
- `./stop.sh` - Stop deployments
- `./kubernetes/scripts/k3d-down.sh` - Destroy k3d cluster completely

