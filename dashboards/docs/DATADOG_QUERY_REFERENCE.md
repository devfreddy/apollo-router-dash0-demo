# Datadog Query Language Reference

## Overview

This document defines the Datadog metric query syntax used in the Apollo Router GraphOS template dashboard. Understanding this syntax is essential for correctly converting queries to PromQL.

**Datadog Docs**: https://docs.datadoghq.com/metrics/

---

## Query Syntax

### Basic Structure

```
AGGREGATION:metric_name{filters} [by {groups}][.modifier()]
```

**Components**:
- **AGGREGATION**: `count`, `avg`, `sum`, `max`, `min`, `pNN` (percentile)
- **metric_name**: The metric being queried (e.g., `http.server.request.duration`)
- **{filters}**: Label filters like `$service`, `$env`, `$version`, or custom attributes
- **by {groups}**: Optional grouping by attributes
- **modifiers**: Optional `.as_count()`, `.as_rate()`, `.rollup()`

### Aggregation Functions

#### count
Counts the number of metric samples or events.

```
count:http.server.request.duration{$service} by {http.response.status_code}
```

- For **histograms**: Returns total number of requests
- For **counters**: Returns total count over time window
- Often combined with `.as_count()` modifier to get explicit point-in-time count

#### avg
Averages the metric values.

```
avg:apollo.router.cache.hit.time{$service} by {kind}
```

- For **histograms**: Averages the metric buckets
- For **gauges**: Averages instantaneous values
- Useful for latency and size metrics

#### sum
Sums all metric values.

```
sum:http.server.request.duration{$service}
```

- For **counters**: Total accumulated count
- For **gauges**: Total across all instances
- Common for throughput and operation counts

#### min / max
Minimum or maximum value.

```
max:http.server.request.duration{$service}
p95:http.server.request.duration{$service}
```

- For **histograms**: Percentile or extreme value
- Useful for latency analysis

#### pNN (Percentiles)
Calculates percentile values (p50, p75, p95, p99, p99.9, etc.).

```
p95:http.server.request.duration{$service} by {subgraph.name}
p99:apollo.router.cache.miss.time{$service}
```

- Always used with **histograms**
- NN is the percentile value (50, 75, 95, 99, etc.)
- Essential for understanding latency distribution

---

## Filters & Template Variables

### Template Variables

Used to dynamically filter across Datadog dashboards:

```
$service     # Service name (e.g., apollo-router)
$env         # Environment (e.g., production, staging)
$version     # Application version
```

**Usage in queries**:
```
count:http.server.request.duration{$service, $env, $version}
```

**Note**: When converting to PromQL, these template variables are typically removed and replaced with specific label selectors or left for manual filtering.

### Custom Attributes

Filter by specific labels:

```
{http.response.status_code:"200"}          # Specific status code
{subgraph.name:"products"}                 # Specific subgraph
{graphql.operation.type:"query"}           # Operation type
{http.request.method:"POST"}               # HTTP method
{apollo_router_cache_kind:"query"}         # Cache type
```

### Combining Filters

Multiple filters use AND logic:

```
count:http.server.request.duration{$service, $env, http.response.status_code:"5xx"}
# Matches: Service AND Env AND HTTP 5xx responses
```

---

## Modifiers

### .as_count()

Convert to explicit point-in-time count (cumulative over time window).

```
count:http.server.request.duration{$service}.as_count()
```

**Effect**: Returns total count of requests in the time window without rate normalization.

**When used**:
- With histogram metrics to get total request count
- When you want "how many total" not "per second"

### .as_rate()

Convert to rate of change (per second).

```
sum:http.server.request.duration{$service}.as_rate()
```

**Effect**: Returns requests-per-second, normalizing by time window.

**When used**:
- When you want throughput (requests/sec) rather than total
- Automatic normalization across different time windows

### .rollup()

Aggregate data at specified interval.

```
avg:cache.size{$service}.rollup(avg, 60)
```

**Parameters**:
- Aggregation function: `avg`, `sum`, `max`, `min`
- Interval in seconds: `60`, `3600`, etc.

**When used**:
- Less common in template dashboards
- For custom time-based aggregation

---

## Common Query Patterns from Apollo Router Template

### Pattern 1: Request Volume by Status Code

```
count:http.server.request.duration{$service} by {http.response.status_code}.as_count()
```

**Meaning**: Total HTTP requests to the router, grouped by response status code
- Metric: `http.server.request.duration` (histogram of request durations)
- Aggregation: `count` (number of requests) + `.as_count()` (explicit total)
- Grouping: By HTTP status code (2xx, 4xx, 5xx, etc.)

### Pattern 2: Throughput (Requests per Second)

```
count:http.server.request.duration{$service, $env}.as_rate()
```

**Meaning**: Request rate in requests per second
- Metric: `http.server.request.duration`
- Aggregation: `count` + `.as_rate()` (per-second rate)
- No grouping: Aggregate across all requests

### Pattern 3: Error Rate Percentage

```
(count:http.server.request.duration{$service, http.response.status_code:"4xx or 5xx"}.as_rate() /
 count:http.server.request.duration{$service}.as_rate()) * 100
```

**Meaning**: Percentage of requests that return 4xx or 5xx errors
- Numerator: Error requests per second
- Denominator: Total requests per second
- Result: Error rate as percentage

### Pattern 4: Latency Percentiles

```
p95:http.server.request.duration{$service} by {subgraph.name}
```

**Meaning**: 95th percentile latency for requests to subgraphs
- Metric: `http.server.request.duration` (histogram)
- Aggregation: `p95` (95th percentile)
- Grouping: By subgraph name (to show per-subgraph latency)

### Pattern 5: Latency Average

```
avg:http.client.request.duration{$service} by {subgraph.name}
```

**Meaning**: Average latency for requests from router to subgraphs
- Metric: `http.client.request.duration` (histogram of backend latency)
- Aggregation: `avg` (average)
- Grouping: By subgraph name

### Pattern 6: Cache Size

```
avg:apollo.router.cache.size{$service} by {kind}
```

**Meaning**: Average cache memory usage, grouped by cache type
- Metric: `apollo.router.cache.size` (gauge)
- Aggregation: `avg` (current value)
- Grouping: By cache kind (query, schema, full-response, etc.)

### Pattern 7: Cache Hit Time

```
p95:apollo.router.cache.hit.time{$service} by {kind}
```

**Meaning**: 95th percentile time for cache hits
- Metric: `apollo.router.cache.hit.time` (histogram)
- Aggregation: `p95` (percentile)
- Grouping: By cache kind

### Pattern 8: Query Planning Duration

```
p50:apollo.router.query_planning.duration{$service}
```

**Meaning**: Median query planning time
- Metric: `apollo.router.query_planning.duration` (histogram)
- Aggregation: `p50` (50th percentile / median)
- No grouping: Aggregate across all operations

---

## Metric Types in Datadog

### Understanding Metric Types

Datadog has three metric types that behave differently:

#### Count (Cumulative Counter)
- **Definition**: Always increases, never decreases (monotonic)
- **Examples**: Total requests, total errors, total cache hits
- **Datadog naming**: Usually ends in `.count` or `.total`
- **Query behavior**: `count:` aggregation gets running total; `.as_rate()` gets per-second rate

#### Gauge
- **Definition**: Instantaneous value at a point in time
- **Examples**: Cache size, connection count, queue depth, current memory usage
- **Datadog naming**: Usually size, count, depth, active, open
- **Query behavior**: `avg:`, `sum:`, `max:` give current/aggregated values; no rate needed

#### Histogram
- **Definition**: Distribution of values across buckets
- **Examples**: Request duration, response latency, payload sizes
- **Datadog naming**: Usually duration, latency, time, size
- **Query behavior**: Supports percentiles; aggregations like `avg:` work on histogram buckets

---

## Label/Attribute Names

Common labels available for filtering and grouping in the Apollo Router metrics:

| Label | Type | Example Values | Usage |
|-------|------|-----------------|-------|
| `http.response.status_code` | string | "200", "404", "500", "2xx", "5xx" | Filter by HTTP response code |
| `http.request.method` | string | "GET", "POST", "PUT", "DELETE" | Filter by HTTP method |
| `http.route` | string | "/graphql", "/api/users" | Filter by HTTP route/path |
| `subgraph.name` | string | "products", "users", "inventory" | Filter by backend subgraph name |
| `graphql.operation.name` | string | "GetUser", "ListProducts" | Filter by GraphQL operation name |
| `graphql.operation.type` | string | "query", "mutation", "subscription" | Filter by operation type |
| `apollo_router_cache_kind` | string | "query", "schema", "full_response" | Filter by cache type |
| `host` / `pod_name` | string | "router-1", "router-prod-1" | Filter by instance/pod |
| `version` | string | "1.0.0", "1.1.0" | Filter by app version |
| `env` | string | "prod", "staging", "dev" | Filter by environment |
| `service` | string | "apollo-router" | Filter by service name |

---

## Query Conversion Notes

### Important Conversions to PromQL

When converting Datadog queries to PromQL, remember:

1. **Metric names**: Dots (`.`) become underscores (`_`)
   - `http.server.request.duration` → `http_server_request_duration`
   - `apollo.router.cache.size` → `apollo_router_cache_size`

2. **Label names**: Datadog labels become PromQL label selectors
   - Datadog: `{http.response.status_code:"200"}`
   - PromQL: `{http_status_code="200"}`

3. **Aggregations depend on metric type**:
   - Histogram `count` → `histogram_sum(increase(...))` or `histogram_sum(sum(...))`
   - Gauge `avg` → `avg({metric})`
   - Counter `avg` → `avg(rate({metric}))`

4. **Percentiles**: Only work on histograms
   - Datadog: `p95:metric{...}`
   - PromQL: `histogram_quantile(0.95, rate({metric}[5m]))`

5. **Rate vs Increase**:
   - Use `rate()` when you want per-second behavior (throughput, RPS)
   - Use `increase()` when you want total change over time window (cumulative count)

---

## References

- **Datadog Metrics Docs**: https://docs.datadoghq.com/metrics/
- **Datadog APM Metrics**: https://docs.datadoghq.com/tracing/metrics/
- **Apollo Router APM**: https://www.apollographql.com/docs/router/configuration/telemetry/apm/
- **PromQL for Datadog Users**: See PROMQL_REFERENCE.md in this directory

---

## Examples from Our Dashboard

### Full Conversion Example: Request Throughput

**Datadog Query**:
```
count:http.server.request.duration{$service, $env} by {http.response.status_code}.as_rate()
```

**Query Breakdown**:
- Metric: `http.server.request.duration` (histogram of request durations)
- Aggregation: `count` (number of requests)
- Modifier: `.as_rate()` (convert to per-second rate)
- Filters: Service and environment template variables
- Grouping: By HTTP response status code

**Interpretation**:
"Show me the rate of HTTP requests to the router, broken down by response status code. This tells me throughput and how many are 2xx vs 4xx vs 5xx."

**Converted to PromQL** (see PROMQL_REFERENCE.md):
```promql
sum by (http_status_code) (rate({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[5m]))
```

---

## Testing Against the Template

To validate your understanding, check these queries in `datadog/graphos-template.json`:

1. Find the "Volume of Requests Per Status Code" panel
   - Note the aggregation and modifiers used
   - Identify the grouping

2. Find the "Throughput: Requests Per Second" panel
   - Compare to the above - what changed?

3. Find a percentile query (search for "p95" or "p99")
   - Understand why percentiles need histogram metrics

4. Find a gauge metric query (like cache size)
   - Note the difference in aggregation from histogram queries
