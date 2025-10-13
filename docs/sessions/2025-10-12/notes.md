# Session Notes - 2025-10-12

## Docker Health Checks and Dash0 Service Map Configuration

### What Was Accomplished

- ✅ Fixed Docker health checks for all services
- ✅ Identified and resolved Apollo Router trace sampling issue
- ✅ Configured router for 100% trace sampling to improve Dash0 service map visibility
- ✅ Created comprehensive Vegeta load test queries hitting all subgraphs
- ✅ Verified service map shows complete federated architecture

### Configuration Changes

#### Docker Compose Health Checks
- **Subgraphs**: Updated health checks to use `wget` with proper GraphQL query and Apollo CSRF headers
  - Changed from: `/.well-known/apollo/server-health` (returns 400 due to CSRF protection)
  - Changed to: `/graphql?query={__typename}` with `--header=apollo-require-preflight: true`
  - File: `docker-compose.yaml` lines 59, 85, 111, 137

- **Router**: Added bash-based health check using `/dev/tcp` for HTTP request
  - Apollo Router image doesn't include curl/wget
  - Used bash built-in `/dev/tcp/localhost/8088` to check health endpoint
  - File: `docker-compose.yaml` lines 32-37

#### Apollo Router Trace Sampling
- **Increased sampling from 10% to 100%** for demo purposes
  - File: `router/router.yaml` line 84
  - Changed: `sampler: 0.1` → `sampler: 1.0`
  - Reason: Service maps are built from traces, not metrics. Low sampling meant few router traces appeared in Dash0

#### Vegeta Load Test Queries
- Created new query files to ensure all subgraphs receive traffic:
  - `vegeta/accounts-me.json` - Queries accounts via `me` query
  - `vegeta/accounts-users.json` - Queries accounts via `users` query
  - `vegeta/products-inventory.json` - Queries products + inventory subgraphs
  - `vegeta/federated-all.json` - Complex federated query hitting all 4 subgraphs
- Updated `vegeta/targets.http` to include new queries

### Key Findings

#### Docker Compose vs Kubernetes Health Checks
- **Docker Compose limitation**: Only supports `exec`-style health checks (commands run inside container)
- **Kubernetes advantage**: Supports multiple probe types including `httpGet` (external HTTP requests)
- This forces Docker users to either include HTTP tools in images or use workarounds
- Apollo Router's minimal image (based on Debian) doesn't include curl/wget by design (security/size)

#### Trace Sampling and Service Maps
- **Service maps require traces**: Metrics alone don't show service relationships
- **Sampling matters**: 10% sampling = only ~3 traces out of 35 requests shown in Dash0
- **Subgraphs vs Router**: Subgraphs use 100% sampling by default (Node.js SDK), router was at 10%
- **Trace propagation**: Router properly configured with W3C Trace Context (`trace_context: true`)
- **No explicit propagator needed**: Node.js OpenTelemetry SDK handles W3C by default

#### Service Naming in Dash0
- Some duplicate services appear in catalog (e.g., "accounts" vs "accounts-subgraph")
- These duplicates show 0 requests and may be from old data or router internal spans
- Primary services correctly named with `-subgraph` suffix

### Status

✅ All services healthy and running
✅ Router sending 100% of traces to Dash0
✅ Service map showing complete architecture:
  - apollo-router-demo → accounts-subgraph
  - apollo-router-demo → products-subgraph
  - apollo-router-demo → reviews-subgraph
  - apollo-router-demo → inventory-subgraph
✅ Vegeta queries configured to hit all subgraphs

### Architecture Insights

The federated GraphQL setup demonstrates trace context propagation:
1. Client → Apollo Router (100% sampled)
2. Router → Subgraphs (W3C Trace Context headers: `traceparent`, `tracestate`)
3. Subgraphs → Dash0 (linked traces showing parent-child relationships)

This creates the service dependency graph visible in Dash0's service map.

### Next Steps

1. **Start Vegeta for continuous load testing**:
   ```bash
   docker compose --profile load-testing up -d vegeta
   ```

2. **Monitor service map in Dash0**:
   - Verify all 4 subgraph connections are visible
   - Check for any errors or latency issues
   - Monitor RED metrics (Rate, Errors, Duration)

3. **Investigate duplicate services** (optional):
   - Query Dash0 to understand where "accounts", "reviews", "products" services (0 requests) are coming from
   - May be old data or internal router spans

4. **Add custom instrumentation** (future enhancement):
   - Add custom spans for specific resolvers
   - Add business metrics (e.g., product views, review submissions)
   - Create custom dashboards in Dash0

5. **Performance testing**:
   - Increase Vegeta rate to simulate higher load
   - Monitor query planning cache performance
   - Test traffic shaping and rate limiting configurations

6. **Documentation**:
   - Add architecture diagram showing trace flow
   - Document health check patterns for future reference
   - Create troubleshooting guide for common issues

### Files Modified

- `docker-compose.yaml` - Updated health checks for all services
- `router/router.yaml` - Increased trace sampling to 100%
- `vegeta/accounts-me.json` - New query file
- `vegeta/accounts-users.json` - New query file
- `vegeta/products-inventory.json` - New query file
- `vegeta/federated-all.json` - New query file
- `vegeta/targets.http` - Added new queries to load test rotation

### Reference Links

- [Apollo Router Health Checks](https://www.apollographql.com/docs/graphos/routing/self-hosted/health-checks)
- [Apollo Router Telemetry Configuration](https://www.apollographql.com/docs/router/configuration/telemetry/exporters/metrics/overview)
- [OpenTelemetry W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Docker Compose Health Check Reference](https://docs.docker.com/compose/compose-file/05-services/#healthcheck)
