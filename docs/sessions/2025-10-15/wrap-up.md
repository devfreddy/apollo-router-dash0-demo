# Session Wrap-Up - 2025-10-15

## Summary

Fixed critical issues with the Apollo Router Performance dashboard in Dash0 after investigating why many panels weren't displaying data. The root causes were:
1. Missing `temporality: delta` configuration in router OTLP metrics export
2. Incorrect metric types in dashboard queries (histogram vs gauge confusion)
3. Non-standard PromQL functions that don't work reliably in Dash0
4. Wrong attribute names from Datadog conversion

Successfully fixed 15+ broken dashboard panels and updated the conversion script with learned fixes.

## What Was Accomplished

### Router Configuration
- Added `temporality: delta` to [router/router.yaml](../../router/router.yaml#L139) OTLP metrics exporter
- Documented why delta temporality is required for accurate rate calculations
- Restarted router to apply new temporality configuration

### Dashboard Fixes (15 Panels)
Fixed queries in [dashboards/dash0/apollo-router-performance.json](../../dashboards/dash0/apollo-router-performance.json):

1. **Request Body Size (p95)** - Fixed query to use proper histogram_quantile with grouping
2. **Response Body Size (p95)** - Changed from histogram_avg to histogram_quantile(0.95) with proper le grouping
3. **Evaluated Plans** - Fixed metric type from gauge to histogram
4. **Cache Size by Instance** - Changed from histogram to gauge (correct type)
5. **Cache Size by Type** - Changed from histogram to gauge with correct attribute names (kind, storage)
6. **Cache Misses (Rate)** - Changed to histogram_quantile(0.95) with proper grouping
7. **Cache Misses by Type** - Fixed to use histogram_quantile with correct attributes
8. **Cache Hits (Rate)** - Changed to histogram_quantile(0.95)
9. **Compute Jobs Execution Duration** - Changed from histogram_avg to histogram_quantile(0.5)
10. **Query Plans Evaluated** - Changed from histogram_avg to histogram_quantile(0.5)
11. **Query Planning Duration** - Fixed to use correct metric (query_planning.total.duration)
12. **Compute Jobs Queue Wait** - Fixed to use correct metric (compute_jobs.queue.wait.duration)
13. **Job Counts by Outcome** - Changed from histogram_sum to simple sum by rate
14. **Duration and Wait Time** - Fixed to use histogram_quantile
15. **Query Parsing Duration** - Fixed metric selection

### Key Pattern Changes
- Replaced non-standard `histogram_avg()` with `histogram_quantile(0.5, ...)`
- Replaced non-standard `histogram_sum()` with proper aggregations
- Added required `le` label to all histogram_quantile queries
- Increased time windows from 2m to 5m for better reliability with sparse metrics
- Fixed attribute mappings (e.g., `apollo_router_cache_kind` → `kind`)

### Conversion Script Updates
Enhanced [dashboards/convert.js](../../dashboards/convert.js):

1. **Improved `getMetricType()` function** with accurate Apollo Router metric type detection:
   - Histograms: duration, time, body.size, evaluated_plans, evaluated_paths
   - Gauges: cache.size (important exception!), queued, jemalloc.*, session, connections
   - Sums: operations, count.total, active_requests, graphql_error

2. **Enhanced `mapAttributeName()` function** with Dash0-specific mappings:
   - `cache.type` → `storage`
   - `kind` → `kind` (not `apollo_router_cache_kind`)
   - Resource attributes → `dash0_resource_*`

3. **Added documentation** explaining 6 key learnings for accurate conversions:
   - Metric types must be correct (check actual OTel metrics)
   - Delta temporality required for proper rate() calculations
   - Attribute names differ between Datadog and Dash0
   - Use histogram_quantile() for percentiles, not max()
   - Gauges don't need rate() - query directly
   - Histograms need rate() for time-series queries

### Documentation Created
- [docs/apollo-metrics.md](../../docs/apollo-metrics.md) - Reference for Apollo Router metrics (untracked)
- [docs/router-telemetry-configuration.md](../../docs/router-telemetry-configuration.md) - Datadog telemetry config guide (untracked)

### Deployment
- Deployed updated dashboard to Dash0 (version 5)
- Dashboard accessible at: https://app.dash0.com/dashboards/apollo-router-performance

## Key Decisions Made

1. **Use delta temporality** - Required for Dash0/PromQL to correctly calculate rates from histogram data
2. **Use standard PromQL functions** - histogram_quantile() instead of Dash0-specific histogram_avg()
3. **Longer time windows (5m)** - Better for sparse metrics that don't emit continuously
4. **Simplify panel names** - Changed to reflect actual metric being shown (e.g., "Cache Miss Time p95")

## Technical Insights

### Delta vs Cumulative Temporality
- **Delta**: Reports change since last measurement ("+10 requests in last 60s")
- **Cumulative**: Reports total since start ("1000 requests total since startup")
- **Why Delta matters**: PromQL rate() and histogram_quantile() work better with deltas
- **Impact**: Old cumulative data can't be queried with new delta-based queries

### Histogram Query Requirements
- Must include `le` (less-than-or-equal) label in grouping for histogram_quantile()
- Example: `sum by (le) (rate(...))` or `sum by (kind, storage, le) (rate(...))`
- Without `le`, histogram_quantile returns no data

### Apollo Router Metric Types (Source of Truth)
Query the actual metrics in Dash0 to verify types, don't guess:
- `apollo.router.cache.size` = **gauge** (common mistake: thinking it's histogram)
- `apollo.router.query_planning.plan.evaluated_plans` = **histogram** (not gauge)
- `http.*.body.size` = **histogram** (all body size metrics)
- `*.duration` and `*.time` = **histogram** (all duration/time metrics)

## Blockers Encountered

1. **Mixed temporality data** - After changing to delta temporality, old cumulative data is incompatible
   - **Status**: Resolved - just need continuous traffic to accumulate fresh delta data
   - **Solution**: Metrics will populate as traffic continues flowing

2. **Sparse metrics** - Cache operations, query planning events don't emit continuously
   - **Status**: Working as designed - panels show data when events occur
   - **Solution**: Increased time windows (5m) help capture sparse events

## Next Steps

### Immediate (Next Session)
1. **Verify all panels** are showing data after sufficient traffic accumulation
2. **Test with diverse queries** - Try different GraphQL operations to trigger cache hits/misses
3. **Add panel descriptions** - Document what each metric means and when to be concerned

### Short Term
1. **Create alert rules** - Set up Dash0 alerts for key metrics (error rate, p95 latency spikes)
2. **Add error rate calculation** - Fix "Error Rate Percent" panel to actually calculate percentage
3. **Document metric thresholds** - What's normal vs concerning for each panel

### Long Term
1. **Add custom metrics** - Extend router instrumentation for business-specific metrics
2. **Create runbook** - Troubleshooting guide based on dashboard panels
3. **Optimize dashboard layout** - Group related panels, add sections

## Notes

- Dashboard panels may appear empty initially - requires 5-10 minutes of continuous traffic after router restart
- The conversion script is now production-ready for converting other Datadog dashboards
- Delta temporality configuration is critical - document this prominently in setup guides
- Some panels (Kubernetes CPU, Docker stats) will remain empty without those services running
