# Setup Guide

This guide will walk you through setting up the Apollo Router + Dash0 observability integration from scratch.

## Prerequisites

Before starting, ensure you have the following installed:

1. **Docker Desktop** (or Docker Engine + Docker Compose)
   - macOS: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Linux: https://docs.docker.com/engine/install/

2. **Apollo Rover CLI** (for supergraph composition)
   ```bash
   curl -sSL https://rover.apollo.dev/nix/latest | sh
   ```

3. **Dash0 Account**
   - Sign up at https://dash0.com
   - Create an API token with write permissions for metrics and traces
   - Note your Dash0 ingestion endpoint (e.g., `ingress.us-west-2.aws.dash0.com`)

## Step-by-Step Setup

### 1. Configure Environment Variables

Copy the sample environment file and edit it with your credentials:

```bash
cp .env.sample .env
```

Edit `.env` and configure:

```bash
# Required: Dash0 API Token
DASH0_AUTH_TOKEN=Bearer your-dash0-token-here

# Required: Dash0 Region
DASH0_REGION=us-west-2  # or your region: us-east-1, eu-central-1, etc.

# These are auto-generated from DASH0_REGION, but you can override:
DASH0_METRICS_ENDPOINT=https://ingress.us-west-2.aws.dash0.com/v1/metrics
DASH0_TRACES_ENDPOINT=https://ingress.us-west-2.aws.dash0.com/v1/traces

# Optional: Apollo GraphOS (if you want to publish your schema)
APOLLO_KEY=service:your-graph-name:your-api-key
APOLLO_GRAPH_REF=your-graph-name@current

# Optional: Custom service metadata
SERVICE_NAME=apollo-router-demo
SERVICE_VERSION=2.0
ENVIRONMENT=demo
```

### 2. Build and Start Subgraphs

Start all subgraphs using Docker Compose:

```bash
docker compose up -d accounts products reviews inventory
```

Wait for all services to be healthy (this may take 30-60 seconds):

```bash
docker compose ps
```

You should see all subgraphs in "healthy" state.

### 3. Compose the Supergraph

Run the composition script to generate the federated supergraph schema:

```bash
./compose-supergraph.sh
```

This will:
- Introspect all running subgraphs
- Compose them into a unified supergraph schema
- Output the schema to `router/supergraph.graphql`

### 4. Start the Apollo Router

Now that the supergraph schema exists, start the router:

```bash
docker compose up -d router
```

Check the router logs to ensure it's sending data to Dash0:

```bash
docker compose logs -f router
```

### 5. Verify the Setup

1. **Access Apollo Sandbox**
   - Open http://localhost:4000 in your browser
   - You should see the Apollo Sandbox interface

2. **Test a Query**
   Run this query in the Sandbox:
   ```graphql
   query TestFederation {
     topProducts(limit: 3) {
       name
       price
       reviews {
         rating
         body
         author {
           name
           username
         }
       }
       inventory {
         quantity
         warehouse
       }
     }
   }
   ```

3. **Check Dash0 Dashboard**
   - Log into your Dash0 account
   - Navigate to the Traces view
   - You should see traces from `apollo-router-demo`
   - Check the Metrics view for request rates, latencies, etc.

### 6. Generate Load (Optional)

To generate realistic traffic for observability testing:

```bash
docker compose --profile load-testing up -d vegeta
```

This will send continuous requests at 5 req/sec to the router. Adjust the rate in `docker-compose.yaml` if needed:

```yaml
command: attack -targets=targets.http -rate=10 -duration=0 -timeout=10s
```

Stop load generation:

```bash
docker compose --profile load-testing down
```

## Troubleshooting

### Subgraphs Not Starting

Check individual subgraph logs:
```bash
docker compose logs accounts
docker compose logs products
docker compose logs reviews
docker compose logs inventory
```

Common issues:
- Port conflicts (check if ports 4001-4004 are available)
- npm install failures (rebuild images: `docker compose build --no-cache`)

### Router Failing to Start

1. **Missing supergraph schema**
   ```
   Error: Failed to read supergraph schema
   ```
   Solution: Run `./compose-supergraph.sh` first

2. **Invalid Dash0 credentials**
   ```
   Error: HTTP 401 Unauthorized
   ```
   Solution: Check your API token in `router/router.yaml`

3. **Subgraphs not reachable**
   ```
   Error: Failed to warm up query planner
   ```
   Solution: Ensure all subgraphs are running and healthy

### No Data in Dash0

1. Check router logs for export errors:
   ```bash
   docker compose logs router | grep -i error
   ```

2. Verify your Dash0 endpoint and region are correct

3. Ensure your API token has write permissions for both metrics and traces

4. Check the router's health endpoint:
   ```bash
   curl http://localhost:8088/health
   ```

### Supergraph Composition Fails

1. Ensure Rover is installed:
   ```bash
   rover --version
   ```

2. Check that all subgraphs are running:
   ```bash
   curl http://localhost:4001/.well-known/apollo/server-health
   curl http://localhost:4002/.well-known/apollo/server-health
   curl http://localhost:4003/.well-known/apollo/server-health
   curl http://localhost:4004/.well-known/apollo/server-health
   ```

## Architecture Overview

```
Client/Vegeta
    ↓
Apollo Router (Port 4000)
    ├─→ Accounts Subgraph (Port 4001)
    ├─→ Products Subgraph (Port 4003)
    ├─→ Reviews Subgraph (Port 4002)
    └─→ Inventory Subgraph (Port 4004)
    ↓
Dash0 (OTLP Metrics & Traces)
```

## Useful Commands

```bash
# View all logs
docker compose logs -f

# Restart everything
docker compose restart

# Stop everything
docker compose down

# Rebuild subgraphs after code changes
docker compose build
docker compose up -d

# Check service health
docker compose ps

# Access individual subgraph GraphQL playgrounds
open http://localhost:4001  # Accounts
open http://localhost:4002  # Reviews
open http://localhost:4003  # Products
open http://localhost:4004  # Inventory
```

## Next Steps

- Customize the subgraph schemas and data
- Add error injection for observability testing
- Create custom Dash0 dashboards
- Experiment with different load patterns
- Configure alerts in Dash0
- Add distributed tracing headers
- Implement authentication/authorization

## Resources

- [Apollo Router Documentation](https://www.apollographql.com/docs/router/)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)
- [Dash0 Documentation](https://docs.dash0.com/)
- [OpenTelemetry Protocol](https://opentelemetry.io/docs/specs/otlp/)
