# Detailed Setup Guide

This guide provides detailed step-by-step instructions for setting up the Apollo Router + Dash0 observability demo.

> **Quick Start:** For automated setup, see the [README](README.md#quick-start) and use `./quickstart.sh`

## Prerequisites

1. **Docker Desktop** (or Docker Engine + Docker Compose)
   - [Install Docker](https://docs.docker.com/get-docker/)

2. **Apollo Rover CLI** (for supergraph composition)
   ```bash
   curl -sSL https://rover.apollo.dev/nix/latest | sh
   ```

3. **Dash0 Account**
   - Sign up at https://dash0.com
   - Create an API token (Settings → API Tokens)
   - Note your region (us-west-2, us-east-1, eu-central-1, etc.)

## Step-by-Step Setup

### 1. Configure Environment Variables

```bash
cp .env.sample .env
```

Edit `.env` and update these required variables:
- `DASH0_AUTH_TOKEN` - Your Dash0 API token with "Bearer " prefix
- `DASH0_REGION` - Your Dash0 region

See [README - Environment Variables](README.md#environment-variables) for complete configuration details.

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

Start Vegeta load generator:

```bash
docker compose --profile load-testing up -d vegeta
```

This sends continuous requests at 2 req/sec. To adjust the rate, edit the `command` in `docker-compose.yaml`:

```yaml
command: attack -targets=/etc/vegeta/targets.http -rate=10 -duration=0 -timeout=10s
```

Stop load generation:

```bash
docker compose stop vegeta
```

## Troubleshooting

### Router Failing to Start

**Missing supergraph schema:**
```bash
./compose-supergraph.sh
docker compose restart router
```

**Invalid Dash0 credentials:**
Check `DASH0_AUTH_TOKEN` in `.env` (must include "Bearer " prefix)

**Subgraphs not reachable:**
```bash
docker compose ps  # Ensure all subgraphs are running
```

### No Data in Dash0

Check router logs for export errors:
```bash
docker compose logs router | grep -i error
```

Verify router health:
```bash
curl http://localhost:8088/health
```

### Apollo Studio Rate Limiting

If you see 503 errors with rate limiting messages:
```bash
# Restart to clear rate limit state
docker compose restart router
```

The router auto-connects to Apollo Studio when `APOLLO_KEY` and `APOLLO_GRAPH_REF` are present in `.env`. At 2 req/sec this should not trigger limits.

## Useful Commands

See [COMMANDS.md](COMMANDS.md) for a comprehensive command reference.

**Quick commands:**
```bash
# View logs
docker compose logs -f router

# Check service health
docker compose ps

# Restart services
docker compose restart

# Stop everything
docker compose down
```

## Next Steps

- Customize subgraph schemas and resolvers
- Create custom Dash0 dashboards
- Experiment with different load patterns
- Configure alerts in Dash0
- Add distributed tracing context propagation

## Resources

- [Apollo Router Documentation](https://www.apollographql.com/docs/router/)
- [Apollo Federation](https://www.apollographql.com/docs/federation/)
- [Dash0 Documentation](https://docs.dash0.com/)
- [OpenTelemetry](https://opentelemetry.io/)
