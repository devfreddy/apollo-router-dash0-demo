# Dashboard Tools - Quick Reference

## All Commands at a Glance

### 🚀 Development (Primary)
```bash
npm run watch:dashboards        # Auto-regenerate when you edit dashboards
```

### 📊 One-Time Operations
```bash
npm run generate:references     # Manually regenerate all references
```

### 🔍 Search & Lookup
```bash
npm run lookup -- metric <name>       # Find panels using a metric
npm run lookup -- panel <name>        # Find panels by name
npm run lookup -- query <text>        # Find queries containing text
npm run lookup -- metrics             # List all available metrics
npm run lookup -- compare             # Compare Dash0 vs Datadog metrics
npm run lookup:help                   # Show all lookup commands
```

## File Structure

```
dashboards/
├── dash0/apollo-router/
│   ├── apollo-router.json           ← Dashboard definition
│   ├── QUERY_REFERENCE.md           ← Generated (markdown)
│   ├── queries.csv                  ← Generated (spreadsheet)
│   └── queries-index.json           ← Generated (JSON index)
│
├── datadog/graphos-template/
│   ├── graphos-template.json        ← Dashboard definition
│   ├── QUERY_REFERENCE.md           ← Generated (markdown)
│   ├── queries.csv                  ← Generated (spreadsheet)
│   └── queries-index.json           ← Generated (JSON index)
│
├── src/
│   ├── watch-dashboards.js          ← File watcher
│   ├── dashboard-query-reference.js ← Reference generator
│   └── dashboard-query-lookup.js    ← Lookup CLI tool
│
└── Documentation Files
    ├── README_QUERY_TOOLS.md        ← Main guide
    ├── DASHBOARD_ORGANIZATION.md    ← Structure guide
    ├── WATCHER_GUIDE.md             ← Watcher details
    └── QUICK_REFERENCE.md           ← This file
```

## Common Workflows

### Editing Dashboards
```bash
# Terminal 1: Start watcher
npm run watch:dashboards

# Terminal 2: Edit your dashboards
# (references auto-update when you save)

# When done:
# Press Ctrl+C in Terminal 1
```

### Finding a Specific Query
```bash
npm run lookup -- query "histogram_quantile(0.99"
```

### Analyzing Metrics
```bash
# Find all panels using a metric
npm run lookup -- metric http.server.request.duration

# Compare dashboards
npm run lookup -- compare
```

### One-Time Update
```bash
npm run generate:references
```

## Documentation Map

| File | Purpose | Read When |
|------|---------|-----------|
| [README_QUERY_TOOLS.md](./README_QUERY_TOOLS.md) | Main guide & examples | Getting started |
| [DASHBOARD_ORGANIZATION.md](./DASHBOARD_ORGANIZATION.md) | Folder structure | Understanding organization |
| [WATCHER_GUIDE.md](./WATCHER_GUIDE.md) | Detailed watcher info | Using the watcher |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | Commands & workflows | Looking up commands |

## Key Concepts

**Dashboard Definition** - The source JSON file
- `dash0/apollo-router/apollo-router.json` (2162 lines, 41 panels, 81 queries)
- `datadog/graphos-template/graphos-template.json` (5052 lines, 39 panels, 107 queries)

**References** - Auto-generated from dashboard definitions
- **Markdown** - Human-readable with TOC
- **CSV** - For Excel/spreadsheet analysis
- **JSON Index** - For programmatic access

**Watcher** - Detects dashboard changes and regenerates references
- Runs during development
- Instant feedback
- No manual steps needed

**Lookup Tool** - Search and analyze references
- Find metrics across dashboards
- Compare dashboards
- Search query contents
- List all available metrics

## Tips & Tricks

### Quick Metric Search
```bash
# Find all P99 latency queries
npm run lookup -- query "quantile(0.99"

# Find cache-related metrics
npm run lookup -- metric apollo.router.cache
```

### Spreadsheet Analysis
```bash
# Export to Excel and filter by column
open dash0/apollo-router/queries.csv
```

### Programmatic Access
```bash
# Use the JSON index in your code
const index = require('./dash0/apollo-router/queries-index.json');
const metricsUsage = index.metricsIndex['http.server.request.duration'];
```

### Comparing Dashboards
```bash
# See which metrics are common
npm run lookup -- compare
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| References not updating | Check watcher is running: `npm run watch:dashboards` |
| File changes not detected | Save file explicitly (Ctrl+S) |
| Metric not found | Run `npm run lookup -- metrics` to see all available |
| Watcher crashes | Check both dashboard files exist |

## Performance

- **Watcher startup**: Instant
- **Change detection**: ~100ms
- **Reference generation**: 1-2 seconds
- **File size**: 6-190 KB per dashboard

## No External Dependencies

The watcher and tools use only Node.js built-in modules:
- `fs` - File system operations
- `path` - Path handling
- `child_process` - Running generator script

## Next Steps

1. **Read** [README_QUERY_TOOLS.md](./README_QUERY_TOOLS.md) for full guide
2. **Start** `npm run watch:dashboards` when editing dashboards
3. **Use** `npm run lookup -- [command]` to search
4. **Commit** updated references along with dashboard changes

---

**Version**: 1.0.0
**Last Updated**: October 30, 2025
**Files**: 80 panels | 188 queries | 26 common metrics
