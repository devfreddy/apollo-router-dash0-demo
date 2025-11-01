# Dashboard Organization Guide

This directory now uses an organized folder structure where each dashboard has its own dedicated folder with the dashboard definition and all reference documents co-located.

## Directory Structure

```
dashboards/
├── dash0/
│   └── apollo-router/                      ← Dash0 Dashboard Folder
│       ├── apollo-router.json              ← Dashboard definition (41 panels, 81 queries)
│       ├── QUERY_REFERENCE.md              ← Markdown breakdown with TOC
│       ├── queries.csv                     ← CSV export (Excel-compatible)
│       └── queries-index.json              ← Structured JSON index
│
├── datadog/
│   └── graphos-template/                   ← Datadog Dashboard Folder
│       ├── graphos-template.json           ← Dashboard definition (39 panels, 107 queries)
│       ├── QUERY_REFERENCE.md              ← Markdown breakdown with TOC
│       ├── queries.csv                     ← CSV export (Excel-compatible)
│       └── queries-index.json              ← Structured JSON index
│
├── src/
│   ├── dashboard-query-reference.js        ← Generator script
│   ├── dashboard-query-lookup.js           ← CLI lookup tool
│   └── config/                             ← Configuration files
│
├── README_QUERY_TOOLS.md                   ← Main guide for query tools
└── package.json                            ← NPM scripts
```

## Dashboard Folders

### `dash0/apollo-router/`

**Dash0 Apollo Router Dashboard** - Complete monitoring dashboard with 5 organized sections:

1. **Client Traffic** (5 panels) - Client → Router metrics
   - Request volume, throughput, error rates, request/response sizes

2. **Backend Services** (6 panels) - Router → Subgraph metrics
   - Subgraph request volume, latency, error rates, response sizes

3. **Router Internals** (11 panels) - Query planning, cache, compute jobs
   - Query plan evaluation, cache hit/miss, job queue metrics

4. **Infrastructure** (8 panels) - CPU and memory usage
   - Kubernetes, Docker, host-level metrics

5. **Coprocessors & Sentinel** (11 panels) - Coprocessor operations and system health
   - Coprocessor latency, success rates, router overhead

**Files**:
- `apollo-router.json` - Complete dashboard definition (2162 lines)
- `QUERY_REFERENCE.md` - Human-readable query breakdown (20 KB)
- `queries.csv` - All 81 queries in spreadsheet format (18 KB)
- `queries-index.json` - Structured data for programmatic access (61 KB)

### `datadog/graphos-template/`

**Datadog Apollo Router Dashboard** - Template for Datadog monitoring with 13 organized sections:

Covers the same monitoring areas as Dash0 but using Datadog's query language and visualization options.

**Files**:
- `graphos-template.json` - Complete dashboard definition (5052 lines)
- `QUERY_REFERENCE.md` - Human-readable query breakdown (21 KB)
- `queries.csv` - All 107 queries in spreadsheet format (19 KB)
- `queries-index.json` - Structured data for programmatic access (73 KB)

## Working with References

### Option 1: View in Markdown

Open the `QUERY_REFERENCE.md` file in any editor:

```bash
# View Dash0 queries
cat dash0/apollo-router/QUERY_REFERENCE.md

# View Datadog queries
cat datadog/graphos-template/QUERY_REFERENCE.md
```

**Features**:
- Quick navigation table of contents
- Queries organized by section and panel
- Syntax-highlighted PromQL/Datadog queries
- Easy to search and browse

### Option 2: Analyze in Spreadsheets

Import the CSV files into Excel or Google Sheets:

```bash
# Dash0 queries
open dash0/apollo-router/queries.csv

# Datadog queries
open datadog/graphos-template/queries.csv
```

**Then**:
- Filter by Section, Panel Name, Metric, or Display Name
- Sort by any column
- Create pivot tables for analysis
- Compare metrics between dashboards

### Option 3: Programmatic Access

Use the JSON index files in Node.js applications:

```javascript
const dash0Index = require('./dash0/apollo-router/queries-index.json');

// Find all panels using a metric
const usages = dash0Index.metricsIndex['http.server.request.duration'];

// List all sections
const sections = dash0Index.sections.map(s => s.name);

// Count queries
const totalQueries = dash0Index.sections.reduce(
  (sum, s) => sum + s.panels.reduce((ps, p) => ps + p.queryCount, 0),
  0
);
```

### Option 4: CLI Lookup Tool

Use the `npm run lookup` command to search interactively:

```bash
# Find all panels using a metric
npm run lookup -- metric http.server.request.duration

# Find panels by name
npm run lookup -- panel "Error Rate"

# Search query contents
npm run lookup -- query "histogram_quantile"

# Compare metrics between dashboards
npm run lookup -- compare
```

## Regenerating References

After modifying a dashboard JSON file, regenerate all references:

```bash
npm run generate:references
```

This will:
1. Parse `dash0/apollo-router/apollo-router.json`
2. Parse `datadog/graphos-template/graphos-template.json`
3. Update all reference files in each folder:
   - `QUERY_REFERENCE.md`
   - `queries.csv`
   - `queries-index.json`

## Key Features

✅ **Co-located Resources** - Dashboard and all references in same folder
✅ **Multiple Formats** - Markdown, CSV, and JSON for different use cases
✅ **Searchable** - CLI tool and CSV filtering for quick discovery
✅ **Programmatic** - JSON indexes for automation
✅ **Well-documented** - Each dashboard has organized reference guides
✅ **Easy Comparison** - Compare queries between Dash0 and Datadog

## Dashboard Statistics

| Metric | Dash0 | Datadog |
|--------|-------|---------|
| Sections | 5 | 13 |
| Panels | 41 | 39 |
| Queries | 81 | 107 |
| Unique Metrics | 29 | 37 |
| Common Metrics | 26 |
| Query Language | PromQL | Datadog APM |

## Common Tasks

### Find all P99 latency queries

```bash
npm run lookup -- query "quantile(0.99"
```

### Export Dash0 cache metrics to Excel

1. Open `dash0/apollo-router/queries.csv` in Excel
2. Filter "Metric" column for `apollo.router.cache.*`
3. Review all cache-related queries

### Compare a metric between dashboards

```bash
npm run lookup -- metric apollo.router.cache.size
```

Shows all occurrences in both Dash0 and Datadog

### Find infrastructure metrics

```bash
npm run lookup -- dash0 query "kubernetes\|docker\|system\|container"
```

## Best Practices

1. **Always regenerate references** after updating dashboard JSON files
2. **Commit both** the JSON and reference files to version control
3. **Use markdown** for documentation and sharing
4. **Use CSV** for spreadsheet analysis
5. **Use JSON index** for automated queries and integrations
6. **Use CLI tool** for quick interactive searches

---

**Structure Organized**: October 30, 2025
**Total Dashboards**: 2 (Dash0, Datadog)
**Total Panels**: 80 | **Total Queries**: 188 | **Common Metrics**: 26
