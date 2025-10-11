# Shell Commands Reference

This document contains all shell commands executed during the setup and configuration of the Apollo Router + Dash0 observability demo.

## Docker Compose Operations

### Check Service Status
```bash
# View all running services
docker compose ps

# View specific service status
docker compose ps router
docker compose ps vegeta
```

### View Logs
```bash
# View last 20 lines of router logs
docker compose logs router --tail=20

# View last 20 lines of vegeta logs
docker compose logs vegeta --tail=20

# View logs from last 5 minutes
docker compose logs vegeta --since 5m

# View last 30 lines and follow (live tail)
docker compose logs router --tail=30 --follow

# View last 50 lines of router logs
docker compose logs router --tail=50

# View logs since specific time (2 minutes)
docker compose logs router --since 2m | grep -E "(POST|GET|query)" | head -20
```

### Restart Services
```bash
# Restart the router service
docker compose restart router
```

### Start/Stop Services
```bash
# Start all services
docker compose up -d

# Start vegeta with load-testing profile
docker compose --profile load-testing up -d vegeta

# Stop all services
docker compose down
```

### Resource Monitoring
```bash
# View real-time stats for all containers
docker stats --no-stream

# View stats for specific containers
docker stats --no-stream apollo-dash0-demo-vegeta-1 apollo-dash0-demo-router-1

# View stats with custom format
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

### Execute Commands in Containers
```bash
# Execute command in vegeta container (example that failed due to missing ps)
docker compose exec vegeta ps aux
```

## Testing and Verification

### Test Router Endpoints
```bash
# Test router health endpoint
curl -s http://localhost:4000/health

# Test CORS preflight for localhost:3000
curl -s -I -X OPTIONS http://localhost:4000 \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control"

# Test CORS preflight for localhost:4000
curl -s -I -X OPTIONS http://localhost:4000 \
  -H "Origin: http://localhost:4000" \
  -H "Access-Control-Request-Method: POST" | grep -i "access-control"
```

Expected CORS response headers:
```
access-control-allow-origin: http://localhost:3000
access-control-allow-credentials: true
access-control-allow-methods: GET, POST, OPTIONS
vary: origin, access-control-request-headers
```

## Git Operations

### Check Repository Status
```bash
# View current git status
git status

# View changes to specific files
git diff README.md
git diff router/router.yaml
```

### Commit Changes
```bash
# Stage all changes
git add -A

# Check what's staged
git status

# Create commit with detailed message
git commit -m "$(cat <<'EOF'
Add Apollo Router Dash0 observability demo with CORS configuration

This commit adds a complete Apollo Router v2 demo project with Dash0
observability integration, including:

- Complete README with project documentation and TODO section
- Apollo Router v2 configuration with Dash0 OTLP exporters
- CORS configuration with documented origins (ports 3000/4000)
- Four federated subgraphs (products, reviews, accounts, inventory)
- Vegeta load testing setup with multiple query patterns
- Docker Compose orchestration for full stack
- Environment variable-based configuration
- Setup scripts and documentation

Key configuration notes:
- CORS enabled for Apollo Sandbox (port 4000) and future frontend apps (port 3000)
- Enterprise features (limits) require GraphOS license and are commented out
- Telemetry exports to Dash0 via OTLP over HTTP

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# View last commit details
git log -1 --stat
```

## Useful Command Patterns

### Wait and Execute
```bash
# Wait 5 seconds then check logs
sleep 5 && docker compose logs router --tail=20
```

### Background Monitoring with Timeout
```bash
# Follow logs for 15 seconds then stop
docker compose logs router --tail=30 --follow &
sleep 15 && kill %1 2>/dev/null
```

### Filter and Search Logs
```bash
# Search for HTTP request methods in logs
docker compose logs router --tail=50 | grep -i "http.request.method"

# Search for specific patterns (POST, GET, query)
docker compose logs router --since 2m | grep -E "(POST|GET|query)" | head -20
```

## Environment Configuration

### View Environment Variables
```bash
# Check environment file
cat .env

# Check sample environment file
cat .env.sample
```

## Network and Connectivity

### Check Container Network I/O
The network I/O stats from `docker stats` show:
- **Router**: 3.17MB sent / 11.4MB received (processing requests)
- **Vegeta**: 706kB sent / 682kB received (generating load)

This confirms active traffic flow between vegeta and the router.

## Common Troubleshooting Commands

### Check if Services are Healthy
```bash
# View all container health statuses
docker compose ps

# Check specific service health
docker compose ps router | grep -E "(healthy|unhealthy)"
```

### Verify Ports are Accessible
```bash
# Test router GraphQL endpoint
curl http://localhost:4000

# Test router health endpoint
curl http://localhost:8088/health

# Test subgraph health endpoints
curl http://localhost:4001/.well-known/apollo/server-health  # accounts
curl http://localhost:4002/.well-known/apollo/server-health  # reviews
curl http://localhost:4003/.well-known/apollo/server-health  # products
curl http://localhost:4004/.well-known/apollo/server-health  # inventory
```

## Configuration Changes Made

### Router Configuration (router/router.yaml)

1. **Enabled CORS** (lines 100-108):
```yaml
# CORS configuration for browser access (v2.7+ format)
# Port 4000: Required for Apollo Sandbox UI (served from the router itself)
# Port 3000: Pre-configured for potential frontend applications (React, Next.js, etc.)
cors:
  policies:
    - origins:
        - http://localhost:3000
        - http://localhost:4000
      allow_credentials: true
```

2. **Documented Enterprise Limits** (lines 110-115):
```yaml
# Limits to prevent abuse (requires Apollo GraphOS Enterprise license)
# NOTE: These features require an Enterprise plan and proper GraphOS connection
# The router must successfully connect to GraphOS with APOLLO_KEY and APOLLO_GRAPH_REF
# limits:
#   max_depth: 100
#   max_height: 200
#   max_aliases: 30
#   max_root_fields: 20
```

### README Updates

Added TODO section with tasks:
1. Test/try out connecting to https://api.us-west-2.aws.dash0.com/mcp with Claude Code
2. Pull in datadog template and recreate it in Dash0

## Session Summary

### Key Findings
1. ✅ **CORS Configuration** - Works without Enterprise license
2. ❌ **Query Limits** - Require Apollo GraphOS Enterprise license
3. ✅ **Router Status** - Running successfully on port 4000
4. ✅ **Vegeta Load Testing** - Generating 2 requests/second
5. ✅ **Telemetry Export** - Successfully sending to Dash0

### Configuration Format Changes
- Updated CORS from deprecated `origins` array to v2.7+ `policies` structure
- Added explanatory comments for port usage (3000 vs 4000)
- Documented Enterprise feature requirements
