# Apollo Router Dashboard Conversion

This directory contains tools and dashboards for converting Apollo GraphOS monitoring templates from Datadog to Dash0.

## Directory Structure

```
dashboards/
├── README.md              # This file
├── convert.js             # Datadog to Dash0 dashboard converter
├── deploy.sh              # Dashboard deployment script
├── datadog/
│   └── graphos-template.json  # Original Datadog dashboard template
└── dash0/
    └── apollo-router-performance.json  # Converted Dash0 dashboard
```

## Quick Start

### 1. Convert Dashboard

Convert the Datadog template to Dash0 Perses format:

```bash
cd dashboards
node convert.js
```

This will:
- Read the Datadog dashboard from `datadog/graphos-template.json`
- Convert all widgets to Perses panel format
- Transform Datadog metric queries to PromQL
- Output to `dash0/apollo-router-performance.json`

### 2. Deploy to Dash0

Deploy the converted dashboard to your Dash0 account:

```bash
./deploy.sh
```

This will:
- Read credentials from `../.env`
- Deploy the dashboard via Dash0 API
- Print the dashboard URL for viewing

### 3. View Dashboard

Open the dashboard in Dash0:
```
https://app.dash0.com/dashboards/apollo-router-performance
```

## Dashboard Conversion Details

### Metric Name Mapping

The converter automatically maps Datadog metric names to OpenTelemetry format:

| Datadog Metric | OTel Metric | Type |
|---------------|-------------|------|
| `http.server.request.duration` | `http_server_request_duration` | histogram |
| `http.client.request.duration` | `http_client_request_duration` | histogram |
| `apollo.router.operations` | `apollo_router_operations` | sum |
| `apollo.router.cache.hit.time` | `apollo_router_cache_hit_time` | histogram |
| `apollo.router.cache.miss.time` | `apollo_router_cache_miss_time` | histogram |
| `apollo.router.query_planning.*` | `apollo_router_query_planning_*` | varies |

**Note:** All dots (`.`) in metric names are converted to underscores (`_`) for PromQL compatibility.

### Query Conversion Examples

**Datadog Query:**
```
count:http.server.request.duration{$service,$env} by {http.response.status_code}.as_count()
```

**Converted PromQL:**
```promql
sum by (http.response.status_code) ({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
})
```

**Datadog Percentile Query:**
```
p95:http.server.request.duration{$service}
```

**Converted PromQL:**
```promql
histogram_quantile(0.95, rate({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[1m]))
```

## Dashboard Panels

The converted dashboard includes **41 panels** organized into sections:

### 1. Client → Router Traffic
- Volume of Requests Per Status Code
- Throughput (Requests Per Second)
- Error Rate Percent
- Request Body Size
- Request Duration Percentiles

### 2. Router → Backend (Subgraphs)
- HTTP Requests by Status Code
- Throughput by Subgraph
- Non-2xx Responses
- Response Body Size
- P95 Latency by Subgraph
- GraphQL Errors by Subgraph

### 3. Query Planning & Compute Jobs
- Duration and Wait Time
- Evaluated Plans
- Queued Jobs
- Job Counts by Outcome
- Query Planning/Parsing Duration Percentiles

### 4. Cache Performance
- Cache Misses vs. Record Count
- Record Counts by Instance
- Record Counts by Type
- Cache Hit Percentage by Instance

### 5. Resource Utilization
- CPU Usage (Kubernetes, Docker, Host)
- Memory Usage (Kubernetes, Docker, Host)

### 6. Additional Features
- Coprocessor Performance
- Uplink and Licensing Metrics
- Subscription Connections

## Known Limitations

1. **Template Variables:** Datadog template variables (`$service`, `$env`, `$version`) are removed during conversion. You may need to add Perses variables if filtering is needed.

2. **Complex Queries:** Some advanced Datadog queries may not convert perfectly. Review the generated PromQL and adjust as needed.

3. **Panel Layouts:** All panels are set to 12-unit width (half screen). You can adjust layouts in the Dash0 UI.

4. **Metric Availability:** The queries assume your Apollo Router is exporting all standard OpenTelemetry metrics. Some panels may be empty if specific metrics aren't available.

## Customization

### Modify Conversion Logic

Edit [convert.js](convert.js) to customize:
- Metric name mappings
- Query aggregation functions
- Panel types and layouts
- Dashboard metadata

### Manual Adjustments

After deployment, you can:
1. Open the dashboard in Dash0
2. Click "Edit as JSON" to see the Perses format
3. Make adjustments directly in the UI
4. Export the updated JSON back to this repository

## Troubleshooting

### Deployment Fails with 401 Unauthorized

Check that your `.env` file has the correct `DASH0_AUTH_TOKEN`:
```bash
# .env
DASH0_AUTH_TOKEN="Bearer auth_your_token_here"
DASH0_REGION=us-west-2
```

### Empty Panels After Deployment

Verify that:
1. Your Apollo Router is running and generating traffic
2. Metrics are being exported to Dash0
3. The metric names match what's in your Dash0 dataset

Use the Dash0 MCP server to check available metrics:
```bash
# In Claude Code
List metrics for service apollo-router-demo
```

### PromQL Syntax Errors

Some Datadog queries may need manual adjustment. Common fixes:
- Check metric names (dots → underscores)
- Verify label names in `by ()` clauses
- Ensure histogram queries use `rate()` for percentiles

## Resources

- **Datadog Template Source:** https://github.com/apollographql/apm-templates/blob/main/datadog/graphos-template.json
- **Dash0 Dashboard Docs:** https://www.dash0.com/documentation/dash0/dashboards
- **Dash0 API Docs:** https://api-docs.dash0.com/
- **Perses Format Spec:** https://www.dash0.com/documentation/dash0/dashboards/dashboard-source-format

## Contributing

To improve the conversion:
1. Test with your Apollo Router setup
2. Document any query adjustments needed
3. Submit improvements to `convert.js`
4. Share PromQL patterns that work well
