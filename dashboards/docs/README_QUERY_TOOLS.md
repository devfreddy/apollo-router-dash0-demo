# Dashboard Query Reference Tools

This toolkit provides comprehensive query indexing and lookup capabilities for both the Dash0 and Datadog Apollo Router monitoring dashboards.

## Problem Solved

Previously, finding specific queries across the dashboard JSON files was difficult because:
- Dashboard JSON files are large and deeply nested
- Queries are referenced by opaque panel IDs like `panel_0`, `panel_1`, etc.
- Hard to compare queries between dashboards
- No easy way to find all panels using a specific metric
- No structured index for programmatic access

This toolkit solves these issues by providing:
- ✅ Searchable markdown references
- ✅ CSV exports for Excel/spreadsheet analysis
- ✅ Structured JSON indexes for programmatic access
- ✅ CLI lookup tool for quick searches
- ✅ Metric comparison between dashboards
- ✅ Panel grouping by section

## Quick Start

### During Development: Use the Watcher

```bash
npm run watch:dashboards
```

This starts a file watcher that automatically regenerates all references whenever you edit a dashboard. Perfect when you're actively working on dashboards!

**See [WATCHER_GUIDE.md](./WATCHER_GUIDE.md) for details.**

### Manual Generation

```bash
npm run generate:references
```

This manually regenerates all reference files in both dashboard folders:
- `dash0/apollo-router/QUERY_REFERENCE.md` - Human-readable Dash0 query breakdown
- `dash0/apollo-router/queries.csv` - Dash0 queries in CSV format
- `dash0/apollo-router/queries-index.json` - Dash0 queries as structured JSON
- `datadog/graphos-template/QUERY_REFERENCE.md` - Human-readable Datadog query breakdown
- `datadog/graphos-template/queries.csv` - Datadog queries in CSV format
- `datadog/graphos-template/queries-index.json` - Datadog queries as structured JSON

### Search for a Metric

Find all panels using `http.server.request.duration`:

```bash
npm run lookup -- metric http.server.request.duration
```

Output shows all occurrences in both dashboards:
```
=== DASH0 ===
✓ Found 14 occurrence(s) of metric: http.server.request.duration

1. Client Traffic > Volume of Requests Per Status Code
   Display: By Http response status_code
   Query: histogram_sum(sum by (http_status_code) ...
```

### Search for a Panel

Find panels matching "Error Rate":

```bash
npm run lookup -- panel "Error Rate"
```

### Search Queries

Find all queries containing "histogram_quantile":

```bash
npm run lookup -- query "histogram_quantile"
```

### List All Metrics

```bash
npm run lookup -- metrics
```

### Compare Dashboards

Show which metrics are common and which are unique:

```bash
npm run lookup -- compare
```

## Files Overview

### Documentation
- **[DASHBOARD_ORGANIZATION.md](./DASHBOARD_ORGANIZATION.md)** - Folder structure and working with references
- **[WATCHER_GUIDE.md](./WATCHER_GUIDE.md)** - How to use the file watcher for live updates
- **[README_QUERY_TOOLS.md](./README_QUERY_TOOLS.md)** - This file

### Generated References (in dashboard folders)
| Dashboard | Files | Purpose |
|-----------|-------|---------|
| Dash0 | `dash0/apollo-router/QUERY_REFERENCE.md` | Markdown with TOC and syntax highlighting |
| Dash0 | `dash0/apollo-router/queries.csv` | Excel-compatible spreadsheet |
| Dash0 | `dash0/apollo-router/queries-index.json` | Structured data with metrics index |
| Datadog | `datadog/graphos-template/QUERY_REFERENCE.md` | Markdown with TOC and syntax highlighting |
| Datadog | `datadog/graphos-template/queries.csv` | Excel-compatible spreadsheet |
| Datadog | `datadog/graphos-template/queries-index.json` | Structured data with metrics index |

### Tools & Scripts
| File | Purpose | Usage |
|------|---------|-------|
| `src/dashboard-query-reference.js` | Generates all reference documents | `npm run generate:references` |
| `src/watch-dashboards.js` | Watches for changes and regenerates | `npm run watch:dashboards` |
| `src/dashboard-query-lookup.js` | CLI tool for searching queries | `npm run lookup -- [command]` |

## Usage Examples

### Example 1: Find the P99 latency query for HTTP requests

```bash
npm run lookup -- metric http.server.request.duration | grep P99
```

**Output:**
```
6. Client Traffic > Request Duration Percentiles
   Display: P99
   Query: histogram_quantile(0.99, rate({otel_metric_name = "http.server.request.duration"...
```

### Example 2: Compare cache metrics between dashboards

```bash
npm run lookup -- metric apollo.router.cache.size
```

Shows how many times this metric appears in each dashboard and which panels use it.

### Example 3: Find all GraphQL error queries

```bash
npm run lookup -- query "graphql.error"
```

### Example 4: Analyze infrastructure monitoring

```bash
npm run lookup -- dash0 metrics | grep -E "container|kubernetes|docker|system"
```

### Example 5: Export all Dash0 latency queries to Excel

1. Run: `npm run generate:references`
2. Open `docs/dash0-queries.csv` in Excel
3. Filter "Display Name" column for "P99", "P95", "P90"
4. Analyze which panels share the same queries

## CLI Command Reference

```bash
npm run lookup -- [dashboard] <command> [args]

# Optional: specify dashboard (default: both)
# [dashboard] = 'dash0' or 'datadog'

# Commands:
metric <name>      Find all panels using a specific metric
panel <name>       Find panels by name (partial match)
query <text>       Find queries containing specific text
metrics            List all available metrics
compare            Compare metrics between Dash0 and Datadog
help               Show help message

# Examples:
npm run lookup -- metric http.server.request.duration
npm run lookup -- dash0 panel "Error Rate"
npm run lookup -- datadog query "anomalies"
npm run lookup -- compare
```

## JSON Index Structure

The JSON indexes provide programmatic access to all dashboard data:

```javascript
{
  "type": "Dash0",
  "generatedAt": "2025-10-30T02:49:25.698Z",
  "sections": [
    {
      "name": "Client Traffic",
      "panelCount": 5,
      "panels": [
        {
          "id": "panel_0",
          "panelIndex": 0,
          "name": "Volume of Requests Per Status Code",
          "queryCount": 1,
          "metrics": ["http.server.request.duration"],
          "queries": [...]
        }
      ]
    }
  ],
  "metricsIndex": {
    "http.server.request.duration": [
      {
        "section": "Client Traffic",
        "panel": "Volume of Requests Per Status Code",
        "panelIndex": 0,
        "displayName": "By Http response status_code",
        "query": "..."
      }
    ]
  }
}
```

Use with `jq` for powerful JSON queries:

```bash
# Find all panels using a metric
cat docs/dash0-queries-index.json | jq '.metricsIndex["http.server.request.duration"]'

# List all sections
cat docs/dash0-queries-index.json | jq '.sections[].name'

# Count queries per panel
cat docs/dash0-queries-index.json | jq '.sections[].panels[] | {name, queryCount}' | head -10
```

## CSV Format

Each CSV has these columns for easy filtering in spreadsheets:

| Column | Description |
|--------|-------------|
| Section | Dashboard section/group name |
| Panel Index | Numeric index of panel |
| Panel Name | Display name of the panel |
| Query Index | Index within the panel |
| Display Name | Label for this query |
| Metric | Extracted metric name |
| Query | Full query text |

Import into Excel and filter/sort by:
- **Metric** - Find which panels use specific metrics
- **Panel Name** - See all queries for a panel
- **Display Name** - Group by query type (P99, P95, etc.)

## Key Metrics Reference

### HTTP Server (Client to Router)
- `http.server.request.duration` - Latency of client requests
- `http.server.request.body.size` - Client request payload size
- `http.server.response.body.size` - Router response payload size

### HTTP Client (Router to Subgraphs)
- `http.client.request.duration` - Latency of subgraph requests
- `http.client.request.body.size` - Payload size to subgraphs
- `http.client.response.body.size` - Response payload from subgraphs

### Router Operations
- `apollo.router.compute_jobs.execution.duration` - Query execution time
- `apollo.router.compute_jobs.queue.wait.duration` - Queue wait time
- `apollo.router.query_planning.plan.evaluated_plans` - Query planning complexity
- `apollo.router.cache.hit.time` - Cache performance
- `apollo.router.cache.miss.time` - Cache misses
- `apollo.router.cache.size` - Cache size

### Infrastructure
- `kubernetes.*` - Kubernetes metrics
- `container.*` - Container metrics
- `docker.*` - Docker metrics
- `system.*` - Host system metrics

## Dashboard Statistics

### Dash0
- **Sections**: 5
  - Client Traffic (5 panels)
  - Backend Services (6 panels)
  - Router Internals (11 panels)
  - Infrastructure (8 panels)
  - Coprocessors & Sentinel (11 panels)
- **Total Panels**: 41
- **Total Queries**: 81
- **Unique Metrics**: 29
- **Query Language**: Prometheus/PromQL

### Datadog
- **Sections**: 13
- **Total Panels**: 39
- **Total Queries**: 107
- **Unique Metrics**: 37
- **Query Language**: Datadog APM/Metrics

## Integration with Development

### Automated Reference Updates

Add to your CI/CD pipeline to keep references fresh:

```yaml
# GitHub Actions example
- name: Update dashboard references
  run: npm run generate:references

- name: Commit changes
  run: |
    git add docs/*.md docs/*.csv docs/*.json
    git commit -m "chore: update dashboard query references"
```

### Using References in Code

Load the JSON index in your Node.js applications:

```javascript
const dash0Index = require('./docs/dash0-queries-index.json');

// Find all panels using a metric
const metricsUsage = dash0Index.metricsIndex['http.server.request.duration'];

// Count queries
const totalQueries = dash0Index.sections.reduce(
  (sum, s) => sum + s.panels.reduce((ps, p) => ps + p.queryCount, 0),
  0
);
```

## Troubleshooting

### References not found

Make sure you've run the generator:
```bash
npm run generate:references
```

### Metric not found

List all available metrics:
```bash
npm run lookup -- metrics
```

Note: Metric names are case-sensitive and include dots (e.g., `apollo.router.cache.size`)

### CSV import issues

If importing to Excel fails:
- Ensure file is opened as UTF-8
- Use Data > Text to Columns if formatting issues occur
- Queries containing newlines are escaped with quotes

## Maintenance

### Regenerating References

Run after updating dashboard JSON files:

```bash
npm run generate:references
```

This will:
1. Parse both dashboard JSON files
2. Extract all queries and metrics
3. Generate markdown, CSV, and JSON references
4. Update all documentation files

### Adding New Queries

1. Update the dashboard JSON file (e.g., `dash0/apollo-router.json`)
2. Run `npm run generate:references`
3. Commit the updated reference files

---

**Last Updated**: October 30, 2025
**Tool Version**: 1.0.0
**Dash0 Dashboard**: 41 panels | 81 queries | 29 metrics
**Datadog Dashboard**: 39 panels | 107 queries | 37 metrics
