# Dashboard Watcher Guide

## Overview

The Dashboard Watcher automatically regenerates query reference documents whenever you modify a dashboard JSON file. This keeps your Markdown, CSV, and JSON index files always in sync with your dashboard definitions during development.

## When to Use

Use the watcher when you're:
- ✅ Actively developing and editing dashboards
- ✅ Adding or modifying panels
- ✅ Changing queries
- ✅ Testing dashboard changes

Don't use the watcher when you're:
- ❌ Just browsing dashboards (unnecessary overhead)
- ❌ On CI/CD pipelines (use `npm run generate:references` instead)
- ❌ In production environments (manual updates only)

## Starting the Watcher

```bash
npm run watch:dashboards
```

This will start a file watcher that monitors both dashboard files:
- `dash0/apollo-router/apollo-router.json`
- `datadog/graphos-template/graphos-template.json`

### Example Output

```
📺 Dashboard Query Reference Watcher
=====================================

Watching for changes to:
  📄 ./dash0/apollo-router/apollo-router.json
  📄 ./datadog/graphos-template/graphos-template.json

Press Ctrl+C to stop watching

[Waiting for file changes...]
```

## How It Works

1. **File Change Detected** - When you save a dashboard JSON file
2. **Regeneration Starts** - The reference generator runs automatically
3. **References Updated** - All reference files are regenerated:
   - `QUERY_REFERENCE.md` (markdown)
   - `queries.csv` (spreadsheet)
   - `queries-index.json` (structured index)
4. **Confirmation** - Console shows success message with timestamp

### Live Example

```
📝 File changed: apollo-router.json

⏱️  10:57:40 PM - Regenerating references...
✓ Found 5 sections
✓ Found 41 panels with 81 queries
...
✅ 10:57:40 PM - References updated
```

## Managing the Watcher

### Stopping the Watcher

Press `Ctrl+C` to stop:

```bash
^C
👋 Stopping watcher...
```

### Multiple Dashboard Edits

If you edit multiple dashboards quickly, the watcher intelligently queues regenerations:

```
📝 File changed: apollo-router.json
📝 File changed: graphos-template.json

⏱️  10:57:40 PM - Regenerating references...
[Generating...]
✅ 10:57:41 PM - References updated
```

### Concurrent Regenerations

If one regeneration is still running when another file changes, the watcher will queue it and run again after the first completes (preventing race conditions).

## Development Workflow

### Typical Workflow with Watcher

```bash
# Terminal 1: Start the watcher
npm run watch:dashboards

# Terminal 2: Edit your dashboards in your editor
# (Make changes to apollo-router.json or graphos-template.json)
# The watcher automatically updates references when you save

# When done with development:
# Press Ctrl+C in Terminal 1 to stop the watcher
```

### With VS Code

1. **Open integrated terminal** in VS Code (`Ctrl+` `)
2. **Run watcher** in the integrated terminal:
   ```bash
   npm run watch:dashboards
   ```
3. **Edit dashboards** in the editor - changes are auto-detected
4. **View reference files** to verify they updated (may need to refresh)

### With Multiple Editors

You can use the watcher with any editor since it watches the filesystem directly:

```bash
# Start the watcher
npm run watch:dashboards

# In your editor of choice:
# - Edit dash0/apollo-router/apollo-router.json
# - Edit datadog/graphos-template/graphos-template.json
# - Save files (Ctrl+S or Cmd+S)
# - Watcher detects changes automatically
```

## What Gets Generated

Every time a dashboard file changes, the watcher regenerates:

### Dash0 Dashboard References
- `dash0/apollo-router/QUERY_REFERENCE.md` - Full markdown breakdown
- `dash0/apollo-router/queries.csv` - Excel-compatible spreadsheet
- `dash0/apollo-router/queries-index.json` - Structured JSON index

### Datadog Dashboard References
- `datadog/graphos-template/QUERY_REFERENCE.md` - Full markdown breakdown
- `datadog/graphos-template/queries.csv` - Excel-compatible spreadsheet
- `datadog/graphos-template/queries-index.json` - Structured JSON index

## Performance

The watcher is designed to be lightweight:

- **Detection**: Instant (native filesystem watching)
- **Regeneration**: ~1-2 seconds (depends on dashboard size)
- **Resource Usage**: Minimal (idle between changes)
- **No Impact**: Only runs when files actually change

## Troubleshooting

### Watcher not detecting changes

**Problem**: File changes aren't being detected

**Solution**: Some editors may not trigger filesystem events. Try:
1. Save the file explicitly (Ctrl+S / Cmd+S)
2. Toggle auto-save off and on in your editor
3. Restart the watcher

### References not updating

**Problem**: Dashboard file changed but references didn't

**Solution**:
1. Check that the watcher is running: `npm run watch:dashboards`
2. Check the console for error messages
3. Try manually generating: `npm run generate:references`

### Watcher crashes

**Problem**: Watcher exits with an error

**Solution**:
1. Check that both dashboard files exist:
   - `dash0/apollo-router/apollo-router.json`
   - `datadog/graphos-template/graphos-template.json`
2. Check file permissions (must be readable)
3. Check for Node.js version compatibility (Node 10+)

## CI/CD Integration

For automated reference generation on commits, use the manual command instead:

```bash
# In CI/CD pipeline
npm run generate:references
```

Don't use the watcher in CI/CD because:
- Watcher is meant for interactive development
- CI/CD should be deterministic and scriptable
- Manual command is more reliable for automation

## Script Details

### Location
`src/watch-dashboards.js`

### Usage
```bash
npm run watch:dashboards
```

### How It Works
1. Watches both dashboard JSON files using Node's `fs.watch()`
2. When a change is detected, spawns the generator script
3. Queues multiple changes if they occur while generating
4. Displays status messages with timestamps
5. Handles graceful shutdown on Ctrl+C

### Implementation Notes
- Uses Node's built-in `fs` module (no external dependencies)
- Handles file system events reliably across platforms
- Prevents race conditions with generation queue
- Shows only essential output from generator

## Related Commands

```bash
# One-time generation
npm run generate:references

# Interactive search tool
npm run lookup -- metric http.server.request.duration

# View CLI help
npm run lookup:help
```

## Summary

The watcher is your ideal companion during dashboard development:
- **Instant Feedback** - References update as you save
- **No Manual Steps** - Forget about running generators
- **Always in Sync** - References never get out of date
- **Clean Output** - Shows only what you need to know

Start it, edit your dashboards, and let it handle the rest!

---

**Created**: October 30, 2025
**File**: `src/watch-dashboards.js`
**Run with**: `npm run watch:dashboards`
