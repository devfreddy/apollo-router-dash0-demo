# Dashboard Organization

This directory contains organized Dash0 dashboards for monitoring Apollo Router performance, organized by functional area and matching the Datadog template groupings.

## Dashboard Options

You have **three approaches** to viewing Apollo Router metrics:

1. **Combined Grouped Dashboard** (Recommended) - All 41 panels in one dashboard with 5 collapsible groups
2. **Individual Focused Dashboards** - 5 separate dashboards, each with 5-11 related metrics
3. **Flat Dashboard** - All 41 panels unorganized in a single view

## Dashboards

### 0. **Combined Grouped Dashboard** (`apollo-router-complete-grouped.json`) ⭐ **RECOMMENDED**
**Focus**: All 41 Apollo Router metrics organized into 5 collapsible groups

This is the recommended way to view all Apollo Router metrics. It combines all panels from the 5 focused dashboards into a single dashboard where each group can be expanded or collapsed.

**Groups** (all expandable/collapsible):
1. **Client Traffic** - 5 panels (client → router metrics)
2. **Backend Services** - 6 panels (router → subgraph metrics)
3. **Router Internals** - 11 panels (query planning, cache, compute jobs)
4. **Infrastructure** - 8 panels (CPU/memory metrics)
5. **Coprocessors & Sentinel** - 11 panels (coprocessor operations & system health)

**Advantages**:
- Single dashboard view with everything
- Collapsible groups reduce clutter
- Easy navigation with group headers
- No context switching between dashboards

---

### 1. **Client Traffic Dashboard** (`client-traffic-dashboard.json`)
**Focus**: Metrics for traffic between clients and the Apollo Router

- **Volume of Requests Per Status Code** - Breakdown of requests by HTTP status code
- **Throughput: Requests Per Second** - Request rate over time
- **Error Rate Percent** - Percentage of error responses
- **Request Body Size (p95)** - 95th percentile of incoming request sizes
- **Request Duration Percentiles** - Response time percentiles

**Use Case**: Monitor the health of client-to-router communication, identify traffic patterns, and spot request volume or error rate issues.

---

### 2. **Router Backend Services Dashboard** (`router-backend-dashboard.json`)
**Focus**: Metrics for traffic between the Router and backend subgraph services

- **HTTP Requests by Status Code** - Subgraph response status distribution
- **Throughput (Requests per Second)** - Request rate to subgraphs
- **Non-2xx Responses** - Error responses from subgraphs
- **Response Body Size (p95)** - 95th percentile of subgraph response sizes
- **P95 Latency by Subgraph** - Backend service response latency
- **GraphQL Errors by Subgraph** - Error counts from backend services

**Use Case**: Monitor subgraph health, identify slow or failing backends, and track federation performance.

---

### 3. **Router Internals Dashboard** (`router-internals-dashboard.json`)
**Focus**: Apollo Router internal operations and performance

**Query Planning Section**:
- **Compute Jobs Execution Duration (p50)** - Job execution performance
- **Query Plans Evaluated (p50)** - Number of execution plans considered
- **Query Planning Duration (p50)** - Query plan compilation time
- **Compute Jobs Queue Wait (p50)** - Queue wait times

**Cache Section**:
- **Cache Size by Instance** - Cache memory usage per instance
- **Cache Size by Type** - Cache usage by type (query, schema, etc.)
- **Cache Miss Time by Type (p95)** - Cache miss penalty
- **Cache Hit Time (p95)** - Cache hit response time
- **Cache Hit/Miss Metrics** - Cache effectiveness

**Compute Jobs Section**:
- **Queued Jobs** - Active job queue depth
- **Compute Jobs by Outcome (Rate)** - Job success/failure rate

**Use Case**: Diagnose performance bottlenecks in query planning, optimize cache settings, and monitor job queue health.

---

### 4. **Infrastructure Dashboard** (`infrastructure-dashboard.json`)
**Focus**: Container, host, and Kubernetes metrics

**CPU Metrics**:
- **Kubernetes CPU Usage** - CPU from Kubernetes metrics
- **Host CPU Usage (OTEL Collector - Hostmetrics)** - Host-level CPU via OTEL
- **Docker CPU Usage (Datadog Docker Agent)** - Container CPU (Datadog)
- **Docker CPU Usage (OTEL Collector - Docker/stats)** - Container CPU via OTEL

**Memory Metrics**:
- **Kubernetes Memory Usage** - Memory from Kubernetes metrics
- **Host Memory Usage (OTEL Collector - Hostmetrics)** - Host-level memory via OTEL
- **Docker Memory Usage (Datadog Docker Agent)** - Container memory (Datadog)
- **Docker Memory Usage (OTEL Collector - Docker/stats)** - Container memory via OTEL

**Use Case**: Monitor resource utilization, identify capacity issues, and track infrastructure health across deployment environments.

---

### 5. **Coprocessors & Sentinel Dashboard** (`coprocessors-dashboard.json`)
**Focus**: Coprocessor operations and sentinel metrics

**Coprocessors Section**:
- **Request Duration** - Coprocessor processing time
- **Request Count** - Coprocessor request volume
- **Success Rate** - Coprocessor success percentage

**Sentinel Metrics Section**:
- **Uplink and Licensing** - Apollo Uplink fetch performance
- **Open Connections by Schema and Launch ID** - Active schema connections
- **Router Relative Overhead** - Router processing overhead
- **Average Request Rate** - Overall throughput
- **Peak Request Rate** - Maximum throughput
- **Baseline Subgraph Latency** - Typical backend latency
- **Average Client Request Size** - Typical request payload size
- **Average Client Response Size** - Typical response payload size

**Use Case**: Monitor coprocessor performance, track overall router health, and monitor licensing/uplink connectivity.

---

### 6. **Main Flat Dashboard** (`apollo-router-performance.json`)
**Focus**: All 41 panels in a single flat dashboard

This is the complete unorganized dashboard with all panels displayed in a single view. Useful as a comprehensive reference but the organized dashboards above are recommended for focused monitoring.

---

## Organization Structure

The dashboards are organized following the original Datadog template structure:

```
Client Communication (5 panels)
├── Request Traffic & Health
└── Request Characteristics

Backend Communication (6 panels)
├── Request Traffic & Health
└── Request Characteristics

Router Operations (11 panels)
├── Query Planning (4 panels)
├── Cache (5 panels)
└── Compute Jobs (2 panels)

Infrastructure (8 panels)
├── CPU Metrics (4 panels)
└── Memory Metrics (4 panels)

Overall Health (11 panels)
├── Coprocessors (3 panels)
└── Sentinel Metrics (8 panels)
```

---

## Usage

### Importing Dashboards to Dash0

1. Use the Dash0 CLI to deploy:
   ```bash
   ./dashboards/deploy.sh
   ```

2. Or manually import JSON files via the Dash0 UI

### Regenerating Dashboards

If you modify the Datadog template or convert new versions:

```bash
# Convert Datadog template and auto-organize
node dashboards/convert.js

# Or just reorganize existing dashboards
node dashboards/organize-dashboards.js
```

### Recommended Monitoring Setup

For a production environment, we recommend:

1. **Quick Overview**: Use the **Client Traffic** dashboard for immediate health checks
2. **Deep Dive**: Use **Router Backend** and **Router Internals** for troubleshooting
3. **Capacity Planning**: Use **Infrastructure** to track resource utilization
4. **Operational Health**: Use **Coprocessors & Sentinel** for overall system status

---

## Metrics Reference

All panels use PromQL queries against Prometheus metrics exported by Apollo Router via OpenTelemetry.

**Key Metric Types**:
- **Histograms**: Duration, latency, and size metrics (use percentiles)
- **Gauges**: Instantaneous values like cache size and queue depth
- **Sums**: Counters for requests, errors, and operations

**Common Label Filters**:
- `subgraph_name` - Backend service name
- `http_status_code` - HTTP response status
- `kind` - Cache type (query, schema, full response, etc.)
- `storage` - Cache storage backend
- `dash0_resource_name` - Instance/pod name
- `job_outcome` - Job result (success, failure, etc.)

---

## Notes

- All dashboards default to **1-hour duration** with **30-second refresh interval**
- Timestamps are relative to dashboard view time (e.g., "last 1 hour")
- Panel layout uses 24-unit width grids with 2 panels per row
- Each organized dashboard focuses on 5-11 related metrics for easier navigation
