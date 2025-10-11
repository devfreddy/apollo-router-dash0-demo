# Apollo Router + Dash0 Demo - Development Notes

## Project Setup & Configuration

### Apollo Router Configuration

**Key Findings:**

1. **Apollo Router Auto-Detection**: The Apollo Router automatically detects `APOLLO_KEY` and `APOLLO_GRAPH_REF` environment variables at startup and connects to Apollo Studio, even when these variables aren't explicitly referenced in router.yaml

2. **Environment Variable Loading**: The `env_file:` directive in `docker-compose.yaml` loads ALL variables from the `.env` file into the router container

3. **CORS Configuration**:
   - ✅ CORS works without Enterprise license
   - Uses v2.7+ policy-based format
   - Configured for Apollo Sandbox (port 4000) and future frontend apps (port 3000)

4. **Enterprise Features**:
   - ❌ Query limits (max_depth, max_height, max_aliases, max_root_fields) require Apollo GraphOS Enterprise license
   - Router will fail to start if these are enabled without proper license
   - These features are documented but commented out in router.yaml

### Load Testing Configuration

**Current Setup:**
- Vegeta rate: 2 req/sec (hardcoded in docker-compose.yaml)
- Duration: infinite (duration=0)
- Note: The `VEGETA_RATE` environment variable in .env is not currently used by docker-compose

**Apollo Free Tier Considerations:**
- At 2 req/sec, Apollo free tier rate limiting should not be an issue
- Higher request rates or accumulated load can trigger Apollo Studio rate limits
- If rate limiting occurs, restart the router to clear state

### Service Architecture

**All Services:**
- accounts, products, reviews, inventory (subgraphs)
- router (Apollo Router v2.7.0)
- vegeta (load generator, requires --profile load-testing)

**Current State:**
- Router running WITH Apollo credentials (for optional Studio integration)
- Dash0 OTLP exporters configured for metrics and traces
- CORS enabled for browser-based clients

---

## Dash0 MCP Server Integration

**Session Date:** 2025-10-11

### What is the Dash0 MCP Server?

The Dash0 MCP (Model Context Protocol) server enables AI assistants to:
- Navigate OpenTelemetry resources in Dash0
- Investigate incidents and query metrics, logs, and traces
- Triage error logs and spans
- Access catalog of services, operations, and metrics
- Use PromQL queries for data analysis

### Configuration Steps

1. **Get Dash0 Credentials:**
   - Log into https://app.dash0.com
   - Go to Organization Settings
   - Copy MCP endpoint URL (e.g., `https://api.us-west-2.aws.dash0.com/mcp`)
   - Create auth token with "All permissions" for desired Datasets

2. **Add MCP Server to Claude Code:**
   ```bash
   claude mcp add --transport http dash0 https://api.us-west-2.aws.dash0.com/mcp \
     --header "Authorization: Bearer YOUR_DASH0_AUTH_TOKEN"
   ```

3. **Verify Installation:**
   ```bash
   claude mcp list
   claude mcp get dash0
   ```

4. **Restart Claude Code:**
   - Reload VSCode window for MCP server to become available
   - Tools will be available in next session

### Resources

- **Dash0 MCP Documentation:** https://www.dash0.com/documentation/dash0/mcp
- **GitHub Repository:** https://github.com/dash0hq/mcp-dash0
- **MCP Endpoint (us-west-2):** https://api.us-west-2.aws.dash0.com/mcp

### Status

✅ MCP server configured and ready for use
⏳ Pending VSCode reload to activate MCP tools
📋 TODO: Test MCP functionality in next session (query metrics, investigate traces, etc.)

### Next Steps

1. **Restart VSCode** to activate the Dash0 MCP server
2. **Verify MCP tools are available** by checking for new Dash0-related tools in Claude Code
3. **Test basic queries**:
   - Query list of services in Dash0
   - Retrieve metrics for Apollo Router (apollo-router-demo)
   - Investigate recent traces and spans
4. **Explore capabilities**:
   - Test PromQL query building for custom metrics
   - Navigate OpenTelemetry resources (services, operations)
   - Investigate any active incidents or error logs
5. **Document findings** in next session notes
6. **Continue with remaining TODOs**: Pull in Datadog template and recreate dashboards in Dash0

---

## Quick Reference

### Port Assignments

- **Router**: Port 4000 (GraphQL endpoint), 8088 (health check)
- **Accounts Subgraph**: Port 4001
- **Reviews Subgraph**: Port 4002
- **Products Subgraph**: Port 4003
- **Inventory Subgraph**: Port 4004
- **Vegeta**: Runs in container, targets router internally at `http://router:4000`

### Essential Commands

```bash
# Start all services
docker compose up -d

# Start with load testing
docker compose --profile load-testing up -d vegeta

# View logs
docker compose logs router -f

# Check service status
docker compose ps

# Test a query manually
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ topProducts { name } }"}'
```

### Troubleshooting Tips

**Router Rate Limiting:**
If you encounter Apollo Studio rate limiting:
```bash
docker compose restart router
docker compose restart vegeta
```

**Missing Supergraph Schema:**
```bash
./compose-supergraph.sh
docker compose restart router
```

**View Resource Usage:**
```bash
docker stats apollo-dash0-demo-router-1 apollo-dash0-demo-vegeta-1
```
