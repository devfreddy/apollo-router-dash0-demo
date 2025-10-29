# PromQL Reference for Apollo Router Monitoring

## Overview

This document defines PromQL (Prometheus Query Language) patterns used in converting Datadog dashboards to Dash0. It covers the specific PromQL patterns, functions, and best practices for monitoring Apollo Router metrics.

**PromQL Docs**: https://prometheus.io/docs/prometheus/latest/querying/basics/

---

## PromQL Basics

### Metric Names

In PromQL, metric names are referenced directly in curly braces with label filters:

```promql
# Select metric by name
http_server_request_duration

# Select metric with label filters
http_server_request_duration{service="apollo-router"}

# Multiple label filters (AND logic)
http_server_request_duration{service="apollo-router", env="prod"}
```

### Label Matching

Four types of label matchers:

```promql
{job="prometheus"}       # Exact match (=)
{job!="prometheus"}      # Not equal (!=)
{env=~"prod|staging"}    # Regex match (=~)
{env!~"dev|test"}        # Not matching regex (!~)
```

### Instant Vector vs Range Vector

```promql
# Instant vector - single point in time
metric_name{labels}

# Range vector - series over time
metric_name{labels}[5m]      # Last 5 minutes
metric_name{labels}[1h]      # Last 1 hour
metric_name{labels}[30s]     # Last 30 seconds
```

---

## Operator Functions

### Aggregation Operators

Used to combine values from multiple time series.

#### sum()
Sum values across all time series.

```promql
# Total requests across all instances
sum(http_server_requests_total)

# Total requests per status code
sum by (http_status_code) (http_server_requests_total)
```

#### avg()
Average values across all time series.

```promql
# Average cache size across instances
avg(cache_size)

# Average latency per subgraph
avg by (subgraph_name) (request_duration_seconds)
```

#### max() / min()
Maximum or minimum value.

```promql
# Peak requests per second
max(rate(requests_total[5m]))

# Minimum latency
min by (subgraph_name) (request_duration_seconds)
```

#### count()
Count number of time series.

```promql
# How many instances are reporting
count(up{job="apollo-router"})
```

#### topk() / bottomk()
Top or bottom K values.

```promql
# Top 5 slowest subgraph endpoints
topk(5, request_duration_seconds)

# 5 fastest endpoints
bottomk(5, request_duration_seconds)
```

### Binary Operators

Perform calculations between time series.

```promql
# Calculate error rate as percentage
(errors_total / requests_total) * 100

# Calculate throughput in requests per second
requests_total / 60  # if counting per minute

# Compare metrics
memory_usage / memory_limit
```

---

## Range Vector Functions

Used with range vectors (metrics with `[duration]`).

### rate()

Calculate the per-second rate of change.

**Critical for**:
- Counters that only increase
- Histograms in time-series mode
- Converting cumulative totals to velocity

```promql
# Requests per second
rate(requests_total[5m])

# Error rate per second
rate(errors_total[5m])

# Histogram bucket rate (for percentiles)
rate(request_duration_seconds_bucket[5m])
```

**Why 5m window?**
- Balances smoothness with responsiveness
- 5 minutes = 300 seconds (typical scrape interval * many samples)
- Adjust based on your scrape interval and desired smoothness

### increase()

Calculate the total increase over a time period.

**Used for**:
- Getting cumulative count over window
- Calculating total events (not per-second)
- When you want "how many" not "how fast"

```promql
# Total requests in last 5 minutes
increase(requests_total[5m])

# Total errors since dashboard opened
increase(errors_total[1h])
```

### irate()

Instant rate - calculates rate using only the last 2 samples.

**Use when**:
- You want immediate responsiveness
- Less smoothing needed
- Tracking rapid changes

```promql
# Immediate request rate
irate(requests_total[5m])
```

**Avoid when**:
- Data is sparse or noisy
- Need stability (use `rate()` instead)

---

## Histogram Functions

Prometheus/OpenTelemetry histograms have special structure with `_bucket`, `_sum`, and `_count` suffixes.

### histogram_quantile()

Calculate percentiles from histogram buckets.

```promql
# 95th percentile latency
histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))

# 50th percentile (median) by subgraph
histogram_quantile(0.50, sum by (subgraph_name, le) (rate(request_duration_seconds_bucket[5m])))

# 99th percentile
histogram_quantile(0.99, rate(request_duration_seconds_bucket[5m]))
```

**Important requirements**:
- Metric must have `_bucket` suffix (automatically added by Prometheus)
- Must include `le` in `sum by()` - this is the bucket boundary label
- Bucket labels are ordered by `le` value
- Often combined with `rate()` for time-series histogram buckets

**Percentile values**:
- `0.5` = 50th percentile (median)
- `0.75` = 75th percentile
- `0.95` = 95th percentile
- `0.99` = 99th percentile
- `0.999` = 99.9th percentile

### histogram_sum()

Get the sum of all histogram values (from `_sum` metric).

```promql
# Total request duration across all requests
histogram_sum(request_duration_seconds)

# Total request time per subgraph (useful for calculating average)
histogram_sum(sum by (subgraph_name) (rate(request_duration_seconds[5m])))
```

### histogram_avg()

Calculate average from histogram buckets.

```promql
# Average request latency
histogram_avg(rate(request_duration_seconds[5m]))

# Average latency per cache type
histogram_avg(sum by (kind) (rate(request_duration_seconds[5m])))
```

### histogram_count()

Count of events in histogram (from `_count` metric).

```promql
# Total number of requests
histogram_count(request_duration_seconds)
```

---

## Common PromQL Patterns for Apollo Router

### Pattern 1: Request Rate (Throughput)

```promql
# Requests per second
sum(rate(http_server_requests_total[5m]))

# Requests per second by status code
sum by (http_status_code) (rate(http_server_requests_total[5m]))

# Using histogram metric as request count
histogram_sum(sum(rate(http_server_request_duration_bucket[5m])))
```

**Why**: Rate normalized by time window gives you throughput/velocity

### Pattern 2: Error Rate

```promql
# Error rate per second
sum(rate(http_server_requests_total{http_status_code=~"5xx|4xx"}[5m]))

# Error rate as percentage
(sum(rate(http_server_requests_total{http_status_code=~"5xx|4xx"}[5m])) /
 sum(rate(http_server_requests_total[5m]))) * 100

# 5xx error rate (server errors)
sum(rate(http_server_requests_total{http_status_code=~"5xx"}[5m]))
```

**Note**: Filter by status code ranges if the data supports it, or specific codes

### Pattern 3: Latency Percentiles

```promql
# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Percentiles by subgraph
histogram_quantile(0.95, sum by (subgraph_name, le) (rate(http_request_duration_seconds_bucket[5m])))

# Multiple percentiles in one query
(
  histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m])) > 0
) or (
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0
) or (
  histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m])) > 0
)
```

### Pattern 4: Average Latency

```promql
# Average request duration
histogram_avg(rate(http_request_duration_seconds[5m]))

# Average latency by subgraph
histogram_avg(sum by (subgraph_name) (rate(http_request_duration_seconds[5m])))

# Average latency by status code
histogram_avg(sum by (http_status_code) (rate(http_request_duration_seconds[5m])))
```

### Pattern 5: Cache Hit Rate

```promql
# Cache hit percentage
(sum(rate(cache_hits_total[5m])) /
 (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))) * 100

# Cache size
avg(cache_size_bytes)

# Cache size by type
avg by (cache_type) (cache_size_bytes)
```

### Pattern 6: Queue Depth

```promql
# Current queue depth
max(compute_job_queue_length)

# Average queue depth over time
avg(compute_job_queue_length)

# Queue depth by instance
compute_job_queue_length
```

### Pattern 7: Instance Count

```promql
# Number of healthy router instances
count(up{job="apollo-router"} == 1)

# Active instances per deployment
count by (deployment) (up{job="apollo-router"} == 1)
```

### Pattern 8: Resource Utilization

```promql
# CPU usage percentage
(cpu_usage_seconds_total / node_cpu_seconds_total) * 100

# Memory usage percentage
(memory_rss_bytes / memory_limit_bytes) * 100

# Memory usage by instance
memory_rss_bytes{job="apollo-router"}
```

---

## Dash0-Specific PromQL

### Dash0 Metric Name and Type Filters

Dash0 uses two special labels for metric identification:

```promql
# Filter by metric name in Dash0
{otel_metric_name="http_server_request_duration"}

# Filter by metric type
{otel_metric_type="histogram"}

# Combined selector
{otel_metric_name="http_server_request_duration", otel_metric_type="histogram"}
```

**Metric types in Dash0**:
- `histogram` - Distribution metrics (percentiles)
- `gauge` - Instantaneous values
- `sum` - Cumulative counters
- `summary` - OpenTelemetry summary type

### Combining Type and Aggregation

```promql
# Histogram metric - use histogram_quantile and rate
histogram_quantile(0.95, sum by (subgraph_name, le) (rate({
  otel_metric_name="http_request_duration",
  otel_metric_type="histogram"
}[5m])))

# Gauge metric - use simple aggregation
avg({
  otel_metric_name="cache_size",
  otel_metric_type="gauge"
})

# Sum/Counter metric - use rate for per-second
sum(rate({
  otel_metric_name="http_requests_total",
  otel_metric_type="sum"
}[5m]))
```

---

## Query Writing Best Practices

### 1. Always include time window in range vectors

```promql
# Good - specifies 5 minute window
rate(metric[5m])

# Bad - no window specified
rate(metric)
```

### 2. Specify labels explicitly for clarity

```promql
# Good - clear what's being filtered
{service="apollo-router", env="prod"}

# Less clear
{service="apollo-router"}
```

### 3. Use aggregation grouping to avoid "too many time series" errors

```promql
# Good - groups by subgraph_name
sum by (subgraph_name) (rate(metric[5m]))

# Potentially verbose - might create one series per (subgraph, status, method, etc)
rate(metric[5m])
```

### 4. Order labels in `sum by()` consistently

```promql
# Good - consistent ordering
sum by (http_status_code, subgraph_name) (rate(metric[5m]))

# Also fine - just be consistent
sum by (subgraph_name, http_status_code) (rate(metric[5m]))
```

### 5. For histograms, always include `le` in aggregation

```promql
# Good - includes le for percentile calculation
histogram_quantile(0.95, sum by (subgraph_name, le) (rate(metric_bucket[5m])))

# Wrong - missing le
histogram_quantile(0.95, sum by (subgraph_name) (rate(metric_bucket[5m])))
```

### 6. Use appropriate time windows

```promql
# For dashboards, typically 5-10 minutes
rate(metric[5m])

# For detailed analysis, might use 1-2 minutes
rate(metric[1m])

# For stability over time, use 10-15 minutes
rate(metric[10m])
```

---

## Conversion Decision Tree

### Choosing rate() vs increase()

```
Do you need per-second rate?
├─ YES → use rate()
│   └─ Example: requests_total[5m] → rate(requests_total[5m])
└─ NO → use increase()
    └─ Example: total_events → increase(total_events[5m])
```

### Choosing histogram function

```
What do you need from histogram?
├─ Percentile (p50, p95, p99)
│   └─ histogram_quantile(value, rate(metric_bucket[5m]))
├─ Average
│   └─ histogram_avg(rate(metric[5m]))
├─ Sum/Total
│   └─ histogram_sum(rate(metric[5m]))
└─ Count of events
    └─ histogram_count(metric)
```

### Choosing aggregation by metric type

```
Metric type?
├─ Histogram (duration, latency, size)
│   ├─ For rate/throughput: histogram_sum(rate(...))
│   ├─ For percentile: histogram_quantile(X%, rate(...))
│   └─ For average: histogram_avg(rate(...))
├─ Gauge (current value)
│   ├─ For current: avg(), sum(), max(), min()
│   └─ No rate() needed
└─ Sum/Counter (monotonic total)
    ├─ For rate/throughput: rate(...)
    └─ For total: increase(...)
```

---

## Dash0 PromQL Examples

### Example 1: Request Throughput by Status

```promql
# Requests per second, grouped by HTTP status code
sum by (http_status_code) (rate({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[5m]))
```

**Equivalent Datadog query**:
```
count:http.server.request.duration{$service} by {http.response.status_code}.as_rate()
```

### Example 2: P95 Latency by Subgraph

```promql
# 95th percentile latency to backend subgraphs
histogram_quantile(0.95, sum by (subgraph_name, le) (rate({
  otel_metric_name="http_client_request_duration",
  otel_metric_type="histogram"
}[5m])))
```

**Equivalent Datadog query**:
```
p95:http.client.request.duration{$service} by {subgraph.name}
```

### Example 3: Error Rate Percentage

```promql
# Error rate as percentage
(sum(rate({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram",
  http_status_code=~"4xx|5xx"
}[5m])) /
 sum(rate({
  otel_metric_name="http_server_request_duration",
  otel_metric_type="histogram"
}[5m]))) * 100
```

### Example 4: Cache Hit Percentage

```promql
# Percentage of cache hits vs total cache requests
(sum(rate({
  otel_metric_name="apollo_router_cache_hit_total",
  otel_metric_type="sum"
}[5m])) /
 (sum(rate({
  otel_metric_name="apollo_router_cache_hit_total",
  otel_metric_type="sum"
}[5m])) +
  sum(rate({
  otel_metric_name="apollo_router_cache_miss_total",
  otel_metric_type="sum"
}[5m])))) * 100
```

### Example 5: Average Cache Size

```promql
# Average cache size across instances, by cache type
avg by (kind) ({
  otel_metric_name="apollo_router_cache_size",
  otel_metric_type="gauge"
})
```

---

## Troubleshooting PromQL Queries

### "No data"

**Causes**:
1. Metric doesn't exist - check metric name and type
2. Label filter too restrictive - remove filters to test
3. Wrong time window - if sparse data, use shorter window

**Debug**:
```promql
# Check if metric exists
{otel_metric_name="http_server_request_duration"}

# Check available labels
group({otel_metric_name="http_server_request_duration"}) by (subgraph_name)
```

### "Too many time series"

**Causes**:
- Missing `sum by ()` or `avg by ()` aggregation
- Grouping by too many dimensions

**Fix**:
```promql
# Bad - potentially thousands of series
rate(metric[5m])

# Good - aggregated to manageable number
sum by (subgraph_name) (rate(metric[5m]))
```

### Percentile returns NaN

**Causes**:
1. Not a histogram metric (need `_bucket` suffix)
2. Missing `le` in aggregation
3. No rate/increase applied

**Fix**:
```promql
# Make sure to include le
histogram_quantile(0.95, sum by (le) (rate(metric_bucket[5m])))

# Or with grouping
histogram_quantile(0.95, sum by (subgraph_name, le) (rate(metric_bucket[5m])))
```

### Histogram function doesn't exist

**Causes**:
- Using wrong function for metric type
- Typo in function name

**Valid histogram functions**:
- `histogram_quantile()`
- `histogram_sum()`
- `histogram_avg()`
- `histogram_count()`

---

## References

- **PromQL Docs**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **OpenTelemetry Metrics**: https://opentelemetry.io/docs/specs/otel/metrics/
- **Dash0 PromQL Guide**: https://www.dash0.com/documentation/dash0/queries
- **Datadog Query Reference**: See DATADOG_QUERY_REFERENCE.md in this directory
