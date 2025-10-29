# Dashboard Conversion Strategy: Datadog → Dash0/PromQL

## Overview

This document outlines a comprehensive strategy for converting monitoring dashboards from Datadog to Dash0 (Perses format). The current approach has some ad-hoc conversions that work but lack proper documentation and systematic translation rules.

**Goal**: Create a sustainable, language-aware conversion system with clear reference documents and systematic translation patterns.

---

## Current State Assessment

### What's Working
- ✅ Basic metric query conversion structure in place
- ✅ Datadog metric name to attribute name mapping partially implemented
- ✅ Widget type detection (timeseries vs stat)
- ✅ Dashboard organization by functional groups
- ✅ Proper PromQL query generation for common patterns

### What Needs Improvement
- ❌ No canonical reference for Datadog query syntax
- ❌ No comprehensive PromQL reference for our use cases
- ❌ No detailed Perses/Dash0 format specification
- ❌ Ad-hoc metric type detection (fragile, needs refactoring)
- ❌ Limited comment documentation in convert.js
- ❌ No formal test suite for conversions
- ❌ Scattered knowledge about mapping rules

---

## Solution Architecture

### 1. Reference Documentation Layer

Create three reference documents that act as sources of truth:

#### A. `DATADOG_QUERY_REFERENCE.md`
Comprehensive guide to Datadog query syntax used in the template.

**Sections**:
- Metric query syntax: `AGGREGATION:metric_name{filters} by {groups}`
- Aggregations: count, avg, sum, max, min, pXX (percentiles)
- Modifiers: `.as_count()`, `.as_rate()`, `.rollup()`
- Filters: `$service`, `$env`, `$version`, custom attributes
- Examples with actual queries from our dashboard

#### B. `PROMQL_REFERENCE.md`
Reference guide for PromQL patterns and functions specific to monitoring Apollo Router.

**Sections**:
- Basic selectors: `{metric_name = "...", attribute = "value"}`
- Aggregation operators: `sum`, `avg`, `max`, `min`, `histogram_quantile`
- Range vectors: `[5m]`, `[1h]`, etc.
- Instant vs range vectors (when to use each)
- Histogram functions: `rate()`, `increase()`, `histogram_quantile()`, `histogram_sum()`, `histogram_avg()`
- Gauge-specific queries (no rate needed)
- Sum/Counter-specific queries (rate for time-series)
- Common patterns:
  - Per-instance aggregation
  - Percentile calculation
  - Error rate calculation
  - Throughput queries
  - Grouping patterns

#### C. `PERSES_DASHBOARD_FORMAT.md`
Complete specification of Perses/Dash0 dashboard JSON structure.

**Sections**:
- Dashboard top-level structure (kind, metadata, spec)
- Panel definitions (queries, plugins, display)
- Query types: TimeSeriesQuery, ScalarQuery, etc.
- Plugin types: TimeSeriesChart, StatChart, etc.
- Layout specifications (Grid, etc.)
- Variable definitions (if using templates)
- Extensions specific to Dash0

---

### 2. Conversion Mapping Tables

Create systematic mapping tables as reference data structures:

#### A. Metric Type Reference Table
```
Metric Pattern → Type → PromQL Treatment
duration      → histogram → rate() + aggregation
.time*        → histogram → rate() + aggregation
body.size     → histogram → rate() + aggregation
cache.size    → gauge     → direct aggregation
*active*      → gauge     → direct aggregation
*total        → sum       → rate() + aggregation
operations    → sum       → rate() + aggregation
```

**Key insight**: Metric TYPE determines PromQL operator choice, not just the aggregation function.

#### B. Aggregation Translation Table
```
Datadog        → PromQL Pattern (depends on metric type)
count          → histogram: histogram_sum(increase(...[range]))
               → sum: sum(rate(...[range]))
               → gauge: sum(...)
avg            → histogram: histogram_avg(rate(...[range]))
               → sum: avg(rate(...[range]))
               → gauge: avg(...)
sum            → histogram: histogram_sum(rate(...[range]))
               → sum: sum(rate(...[range]))
               → gauge: sum(...)
p50/p95/p99    → histogram: histogram_quantile(0.50/0.95/0.99, rate(...[range]))
max/min        → all: max(...) / min(...)
```

#### C. Label/Attribute Mapping Table
```
Datadog Label            → Dash0/PromQL Attribute → Usage
http.response.status_code → http_status_code      → Filter by HTTP status
http.request.method      → http_method            → Filter by request method
subgraph.name            → subgraph_name          → Filter by subgraph/service
graphql.operation.name   → graphql_operation_name → Filter by GraphQL operation
graphql.operation.type   → graphql_operation_type → Filter by operation type
cache.type (apollo)      → kind                   → Filter by cache type (query, schema, etc)
host/pod_name            → dash0_resource_name    → Filter by host/pod instance
```

---

### 3. Conversion Engine Refactoring

Restructure `convert.js` to be more modular and maintainable:

#### A. Module Structure
```
convert.js
├── const METRIC_TYPE_RULES          // Metric detection rules
├── const AGGREGATION_PATTERNS       // Aggregation translation
├── const ATTRIBUTE_MAPPING          // Label name mapping
├── function detectMetricType()      // Improved metric type detection
├── function translateAggregation()  // Translate Datadog agg to PromQL
├── function buildPromQLSelector()   // Build {key="value"} part
├── function buildPromQLQuery()      // Combine selector + aggregation
├── function translateQuery()        // Main orchestration
├── function convertWidget()         // Widget to panel
└── function convertDashboard()      // Full conversion
```

#### B. Key Functions

**`detectMetricType(metricName)`**
- Input: metric name from Datadog query
- Output: "histogram" | "gauge" | "sum"
- Uses comprehensive rule set from METRIC_TYPE_RULES
- Includes comments explaining why each rule exists

**`translateAggregation(datadogAgg, metricType, hasGroupBy)`**
- Input: Datadog aggregation (count, avg, p95, etc.), metric type, grouping
- Output: PromQL aggregation pattern
- Uses AGGREGATION_PATTERNS table
- Explains decision at each step

**`buildPromQLQuery(metricName, aggregation, groupBy, metricType)`**
- Orchestrates the full conversion
- Applies correct PromQL functions based on metric type and aggregation
- Well-commented with decision logic

---

### 4. Implementation Plan

#### Phase 1: Documentation (Foundational)
1. Create `DATADOG_QUERY_REFERENCE.md` - Extract patterns from existing template
2. Create `PROMQL_REFERENCE.md` - Document all PromQL patterns we use
3. Create `PERSES_DASHBOARD_FORMAT.md` - Map out Perses structure
4. Create `CONVERSION_MAPPINGS.md` - Formalize mapping tables

#### Phase 2: Code Refactoring
1. Extract mapping tables from convert.js logic into constants
2. Refactor metric type detection into rule-based system
3. Split query translation into smaller, testable functions
4. Add comprehensive inline documentation

#### Phase 3: Testing & Validation
1. Create query conversion test suite with before/after examples
2. Validate against actual metrics in Dash0
3. Document edge cases and special handling

#### Phase 4: Maintenance
1. Keep reference docs updated as new patterns emerge
2. Add conversion examples when handling new metric types
3. Build test suite as new conversions are needed

---

## Conversion Rules by Metric Type

### Histogram Metrics (duration, size, latency)

**Pattern Recognition**:
- Metric names containing: `duration`, `time`, `latency`, `size`

**PromQL Translation**:
```
Datadog: count:metric{...} by {...}.as_count()
PromQL:  histogram_sum(sum by (...) (increase({metric}[5m])))

Datadog: avg:metric{...}
PromQL:  histogram_avg(rate({metric}[5m]))

Datadog: p95:metric{...} by {...}
PromQL:  histogram_quantile(0.95, sum by (..., le) (rate({metric}[5m])))
```

**Why this works**:
- Histograms in Prometheus/OpenTelemetry come with buckets and a `_sum` and `_count` suffix
- `rate()` is needed for time-series behavior (derivatives over time)
- `histogram_quantile()` requires the `le` (less than or equal) label
- `increase()` gets total count without rate (for point-in-time counts)

### Gauge Metrics (current values)

**Pattern Recognition**:
- Metric names containing: `size`, `count`, `active`, `queued`, `connections`
- Specifically: cache metrics, queue depth, connection counts

**PromQL Translation**:
```
Datadog: avg:cache.size{...} by {...}
PromQL:  avg by (...) ({metric_name="cache_size"})

Datadog: sum:active.connections{...}
PromQL:  sum({metric_name="active_connections"})
```

**Why this works**:
- Gauges represent instantaneous values, no time derivative
- No `rate()` needed - just select and aggregate
- Simple `sum/avg/max/min` operators directly on the metric

### Sum/Counter Metrics (incremental totals)

**Pattern Recognition**:
- Metric names containing: `total`, `operations`, `count`, `errors`, `requests`

**PromQL Translation**:
```
Datadog: count:operations{...} by {...}
PromQL:  sum by (...) (rate({metric_name="operations"}[5m]))

Datadog: sum:errors{...}.as_count()
PromQL:  sum(increase({metric_name="graphql_error"}[5m]))
```

**Why this works**:
- Counters only increase (monotonic), used for cumulative counts
- `rate()` calculates per-second rate of increase
- `increase()` gets total increase over time window

---

## Common Query Patterns & Examples

### Example 1: Request Throughput by Status Code

**Datadog**:
```
count:http.server.request.duration{$service} by {http.response.status_code}.as_count()
```

**Analysis**:
- Metric: `http.server.request.duration` (histogram)
- Aggregation: `count` + `.as_count()` = total request count
- Grouping: By `http.response.status_code`

**PromQL**:
```
histogram_sum(sum by (http_status_code) (increase({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[5m])))
```

**Explanation**:
- Use `histogram_sum()` because metric is a histogram
- Use `increase()` for total count (not rate)
- Group by the HTTP status code
- Window: 5 minutes (adjust as needed)

### Example 2: P95 Latency by Subgraph

**Datadog**:
```
p95:http.client.request.duration{$service} by {subgraph.name}
```

**Analysis**:
- Metric: `http.client.request.duration` (histogram)
- Aggregation: `p95` (95th percentile)
- Grouping: By `subgraph.name`

**PromQL**:
```
histogram_quantile(0.95, sum by (subgraph_name, le) (rate({
  otel_metric_name="http_client_request_duration",
  otel_metric_type="histogram"
}[5m])))
```

**Explanation**:
- Use `histogram_quantile()` for percentiles
- Must include `le` in grouping (Prometheus histogram format requirement)
- Use `rate()` for time-series behavior
- Window: 5 minutes

### Example 3: Cache Hit Ratio

**Datadog**:
```
avg:apollo.router.cache.hit.time{$service} by {kind}
```

**Analysis**:
- Metric: `apollo.router.cache.hit.time` (histogram)
- Aggregation: `avg` (average)
- Grouping: By cache `kind` (query, schema, etc.)

**PromQL**:
```
histogram_avg(sum by (kind) (rate({
  otel_metric_name="apollo_router_cache_hit_time",
  otel_metric_type="histogram"
}[5m])))
```

**Explanation**:
- Use `histogram_avg()` for averaging histogram buckets
- Group by cache kind
- Rate for time-series behavior

---

## Testing Strategy

### Unit Test Cases

Test the conversion functions with known inputs/outputs:

```javascript
test("Histogram count query with grouping", () => {
  const datadog = "count:http.server.request.duration{} by {http.response.status_code}.as_count()";
  const expected = 'histogram_sum(sum by (http_status_code) (increase({...}[5m])))';
  assert.equal(convertToPromQL(datadog), expected);
});

test("Histogram percentile query with single group", () => {
  const datadog = "p95:http.client.request.duration{} by {subgraph.name}";
  const expected = 'histogram_quantile(0.95, sum by (subgraph_name, le) (rate({...}[5m])))';
  assert.equal(convertToPromQL(datadog), expected);
});

test("Gauge query without grouping", () => {
  const datadog = "avg:cache.size{}";
  const expected = 'avg({...})';
  assert.equal(convertToPromQL(datadog), expected);
});
```

### Integration Test Cases

Test full dashboard conversion with sample Datadog JSON:

```javascript
test("Convert complete dashboard with mixed metric types", () => {
  const datadogDash = loadFixture('sample-datadog-dashboard.json');
  const result = convertDashboard(datadogDash);

  // Validate structure
  assert.equal(result.kind, 'Dashboard');
  assert(result.spec.panels.length > 0);

  // Validate queries
  for (const panel of Object.values(result.spec.panels)) {
    const promql = panel.spec.queries[0].spec.plugin.spec.query;
    assert(promql.includes('rate(') || promql.includes('increase(') || promql.includes('histogram_'));
  }
});
```

---

## Migration Path

### Step 1: Document Current Knowledge
- Capture what works in DATADOG_QUERY_REFERENCE.md
- Document PromQL patterns in PROMQL_REFERENCE.md
- Extract metric type rules into CONVERSION_MAPPINGS.md

### Step 2: Refactor Code
- Extract magic values into named constants
- Create rule-based metric type detection
- Add inline documentation explaining each decision
- Create helper functions for clarity

### Step 3: Validate
- Run against existing Datadog template
- Compare generated PromQL with current output
- Test edge cases

### Step 4: Expand
- Add support for new metric types as needed
- Maintain test suite with new examples
- Update docs with new patterns

---

## Maintenance & Evolution

### When Adding New Metrics

1. **Identify metric type**: Duration? Size? Count? Status?
2. **Document in reference docs**: Add to DATADOG_QUERY_REFERENCE.md with example
3. **Update mapping**: Add to metric type rules if new pattern
4. **Add test case**: Document before/after conversion
5. **Update code**: Add rule to detect type or aggregation pattern

### When Datadog Changes Syntax

1. Update DATADOG_QUERY_REFERENCE.md with new syntax
2. Update regex patterns in convert.js
3. Add test cases for new format
4. Update CONVERSION_MAPPINGS.md if rules change

### When PromQL Best Practices Change

1. Update PROMQL_REFERENCE.md
2. Update translateAggregation() function
3. Add test cases showing old vs new
4. Update example queries

---

## Success Criteria

✅ **Documentation**:
- 3 reference documents complete and accurate
- Clear explanation of why each rule exists
- Real examples from our dashboard

✅ **Code Quality**:
- convert.js is modular and testable
- Each function has clear responsibility
- Comments explain the "why" not just "what"
- Mapping tables are separate from logic

✅ **Reliability**:
- Test suite covers common patterns
- Edge cases documented
- Conversion output matches hand-validated PromQL

✅ **Maintainability**:
- New developers can understand conversion rules
- Easy to add new metric types
- Easy to debug conversion failures
- Documentation grows with codebase

---

## Files to Create/Modify

### New Reference Documents
- [ ] `DATADOG_QUERY_REFERENCE.md` - Datadog syntax guide
- [ ] `PROMQL_REFERENCE.md` - PromQL patterns guide
- [ ] `PERSES_DASHBOARD_FORMAT.md` - Dashboard format spec
- [ ] `CONVERSION_MAPPINGS.md` - Formal mapping tables

### Code Changes
- [ ] `convert.js` - Refactor with improved structure
- [ ] `conversion-mappings.json` - Extracted mapping data
- [ ] `conversion.test.js` - Test suite (optional but recommended)

### Supporting Files
- [ ] Sample Datadog dashboards for testing
- [ ] Sample PromQL queries for validation

---

## Next Steps

1. **Start with Phase 1**: Create the three main reference documents
2. **Extract patterns**: As you write docs, identify all conversion rules
3. **Refactor incrementally**: Update convert.js to use extracted rules
4. **Validate**: Test against existing dashboard
5. **Expand**: Document edge cases as they're discovered

This approach turns ad-hoc knowledge into systematic, maintainable conversion logic.
