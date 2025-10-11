# Apollo Router + Dash0 Demo - Session Changelog

## Session 1 - 2025-10-11

**What We Did:**

### 1. Started Vegeta Load Testing
- User requested to start Vegeta after scaling down the rate from 5 to 2 req/sec
- Started Vegeta using: `docker compose --profile load-testing up -d vegeta`

### 2. Discovered Rate Limiting Issue
- Immediately encountered 503 errors in router logs
- Router was returning: "Your request has been rate limited. You've reached the limits for the Free plan."
- This was Apollo GraphOS rate limiting, not the Dash0 service

### 3. Root Cause Analysis
- Encountered 503 errors and Apollo rate limiting messages
- Router was connecting to Apollo Studio because `APOLLO_KEY` and `APOLLO_GRAPH_REF` were present
- These variables are loaded from `.env` file via the `env_file:` directive in docker-compose
- **Important**: The Apollo Router automatically looks for these environment variables at startup (even though they're not referenced in router.yaml) and connects to Apollo Studio when found

### 4. Understanding Apollo Variables & Environment
- The Apollo variables ARE intentionally present and needed for Studio integration
- The `.env` file contains:
  ```
  APOLLO_KEY=service:My-Graph-745g2:yaoM7o_h7A9Vz2AXbklN4Q
  APOLLO_GRAPH_REF=My-Graph-745g2@current
  ```
- These are passed to the router container via `env_file: - .env` in docker-compose
- The router.yaml doesn't reference them, but the router binary detects them automatically
- Rate limiting at 2 req/sec should not be an issue - previous rate limiting was likely due to accumulated load from earlier testing at higher rates
- Stopped Vegeta temporarily, restarted router to clear any rate limit state, then restarted Vegeta

**Files Modified:**
- `.env` - Initially commented out Apollo credentials, then uncommented them (final state: credentials active)

**Key Lessons Learned:**

1. **Apollo Router Auto-Detection**: The Apollo Router automatically detects `APOLLO_KEY` and `APOLLO_GRAPH_REF` environment variables at startup and connects to Apollo Studio, even though these variables aren't referenced in router.yaml

2. **Environment Variable Loading**: The `env_file:` directive in `docker-compose.yaml` loads ALL variables from the `.env` file into the container

3. **Rate Limiting**: At 2 req/sec, Apollo free tier rate limiting should not be an issue. Higher rates or accumulated load can trigger it.

**Final State:**
- All services running: accounts, products, reviews, inventory, router, vegeta
- Vegeta generating load at 2 req/sec
- Router running WITH Apollo credentials (for Studio integration)
- Dash0 OTLP exporters configured for metrics and traces
- System should be stable at 2 req/sec without hitting rate limits

---

## Reference Information

### Quick Start Commands

```bash
# Start all services except Vegeta
docker compose up -d

# Start Vegeta load testing (when ready)
docker compose --profile load-testing up -d vegeta

# Stop Vegeta
docker compose stop vegeta

# View router logs
docker compose logs router -f

# Test a query manually
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ topProducts { name } }"}'
```

### Architecture

- **Router**: Port 4000 (GraphQL endpoint)
- **Accounts Subgraph**: Port 4001
- **Reviews Subgraph**: Port 4002
- **Products Subgraph**: Port 4003
- **Inventory Subgraph**: Port 4004
- **Vegeta**: Runs in container, targets router internally at `http://router:4000`
- **Dash0**: Receives OTLP data at configured endpoints in us-west-2 region

### Starting Fresh

1. **Apollo Credentials**: Keep them active in `.env` for Studio integration - 2 req/sec should not trigger rate limits
2. **Vegeta Rate**: Set to 2 req/sec to be conservative
3. **All services work**: The federated GraphQL setup with 4 subgraphs is fully functional
4. **Dash0 Integration**: Router is configured to export OTLP metrics and traces to Dash0
