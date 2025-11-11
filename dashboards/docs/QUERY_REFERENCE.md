# Dash0 Dashboard Query Reference

**Generated**: 2025-11-11T03:06:41.658Z

## Quick Navigation

- [Request Traffic & Health: Client → Router](#section-0)
- [ Request Characteristics: Client → Router](#section-1)
- [Request Performance & Latency: Client → Router](#section-2)
- [Request Traffic & Health: Router → Backend](#section-3)
- [ Request Characteristics: Router → Backend](#section-4)
- [Request Performance & Latency: Router → Backend](#section-5)
- [Query Planning](#section-6)
- [Cache](#section-7)
- [Compute Jobs](#section-8)
- [Container/Host](#section-9)
- [Coprocessors](#section-10)
- [Sentinel Metrics](#section-11)
- [Resource Estimator](#section-12)

---

## Section 0: Request Traffic & Health: Client → Router

### Panels: 8

#### Panel 0: **Set Up Recommended SLOs & Alerts:**
- **ID**: `panel_0`
- **Queries**: 0

#### Panel 1: Volume of Requests Per Status Code
- **ID**: `panel_1`
- **Queries**: 1

##### Queries

**Query 0**: By Http response status_code
- **Metric**: `http.server.request.duration`
```
histogram_sum(sum by (http_status_code) (increase({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

#### Panel 2: Throughput: Requests Per Second
- **ID**: `panel_2`
- **Queries**: 1

##### Queries

**Query 0**: Total
- **Metric**: `http.server.request.duration`
```
histogram_sum(sum(increase({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

#### Panel 3: This chart shows the volume of requests Apollo Router is han...
- **ID**: `panel_3`
- **Queries**: 0

#### Panel 4: This chart shows requests per second (RPS) hitting the Apoll...
- **ID**: `panel_4`
- **Queries**: 0

#### Panel 5: Error Rate Percent
- **ID**: `panel_5`
- **Queries**: 3

##### Queries

**Query 0**: Total
- **Metric**: `http.server.request.duration`
```
histogram_sum(sum(increase({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram", graphql_errors="true"}[2m])))
```

**Query 1**: Total
- **Metric**: `http.server.request.duration`
```
histogram_sum(sum(increase({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram", http_status_code!~"2.*", http_status_code!~"4.*"}[2m])))
```

**Query 2**: Total
- **Metric**: `http.server.request.duration`
```
histogram_sum(sum(increase({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

#### Panel 6: This chart shows the total error rate percentage of requests...
- **ID**: `panel_6`
- **Queries**: 0

#### Panel 7: This chart focuses specifically on GraphQL errors from subgr...
- **ID**: `panel_7`
- **Queries**: 0


## Section 1:  Request Characteristics: Client → Router

### Panels: 2

#### Panel 8: Request Body Size (p99 / Max)
- **ID**: `panel_8`
- **Queries**: 2

##### Queries

**Query 0**: Max
- **Metric**: `http.server.request.body.size`
```
histogram_avg(sum(rate({otel_metric_name = "http.server.request.body.size", otel_metric_type = "histogram"}[2m])))
```

**Query 1**: P99
- **Metric**: `http.server.request.body.size`
```
histogram_quantile(0.99, sum(rate({otel_metric_name = "http.server.request.body.size", otel_metric_type = "histogram"}[2m])))
```

#### Panel 9: This chart shows the size of incoming HTTP request bodies, h...
- **ID**: `panel_9`
- **Queries**: 0


## Section 2: Request Performance & Latency: Client → Router

### Panels: 4

#### Panel 10: **Apollo Router Latency Overview**
- **ID**: `panel_10`
- **Queries**: 0

#### Panel 11: Request Duration Percentiles
- **ID**: `panel_11`
- **Queries**: 5

##### Queries

**Query 0**: P99
- **Metric**: `http.server.request.duration`
```
histogram_quantile(0.99, sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

**Query 1**: P95
- **Metric**: `http.server.request.duration`
```
histogram_quantile(0.95, sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

**Query 2**: P90
- **Metric**: `http.server.request.duration`
```
histogram_quantile(0.9, sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

**Query 3**: Min
- **Metric**: `http.server.request.duration`
```
histogram_avg(sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

**Query 4**: Max
- **Metric**: `http.server.request.duration`
```
histogram_avg(sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m])))
```

#### Panel 12: This chart shows the distribution of request durations for t...
- **ID**: `panel_12`
- **Queries**: 0

#### Panel 13: **How to interpret percentiles**
- **ID**: `panel_13`
- **Queries**: 0


## Section 3: Request Traffic & Health: Router → Backend

### Panels: 7

#### Panel 14: **Set Up Recommended SLOs & Alerts:**
- **ID**: `panel_14`
- **Queries**: 0

#### Panel 15: Http Requests by Status Code
- **ID**: `panel_15`
- **Queries**: 2

##### Queries

**Query 0**: By status_code, name
- **Metric**: `http.client.request.duration`
```
histogram_sum(sum by (http_status_code, subgraph_name) (increase({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", connector_source_name!~".*"}[2m])))
```

**Query 1**: By status_code, name, name
- **Metric**: `http.client.request.duration`
```
histogram_sum(sum by (http_status_code, subgraph_name, connector_source_name) (increase({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", connector_source_name=~".*"}[2m])))
```

#### Panel 16: Throughput (Requests per Second)
- **ID**: `panel_16`
- **Queries**: 2

##### Queries

**Query 0**: By Subgraph name
- **Metric**: `http.client.request.duration`
```
sum by (subgraph_name) (rate({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", connector_source_name!~".*"}[2m]))
```

**Query 1**: By name, name
- **Metric**: `http.client.request.duration`
```
sum by (subgraph_name, connector_source_name) (rate({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", connector_source_name=~".*"}[2m]))
```

#### Panel 17: This chart shows the volume of outgoing HTTP requests from t...
- **ID**: `panel_17`
- **Queries**: 0

#### Panel 18: This chart shows how many requests per second (RPS) each sub...
- **ID**: `panel_18`
- **Queries**: 0

#### Panel 19: Non-2xx Responses
- **ID**: `panel_19`
- **Queries**: 2

##### Queries

**Query 0**: By name, status_code
- **Metric**: `http.client.request.duration`
```
histogram_sum(sum by (subgraph_name, http_status_code) (increase({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", subgraph_name=~".*", http_status_code!~"2.*", connector_source_name!~".*"}[2m])))
```

**Query 1**: By name, status_code, name
- **Metric**: `http.client.request.duration`
```
histogram_sum(sum by (subgraph_name, http_status_code, connector_source_name) (increase({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", subgraph_name=~".*", http_status_code!~"2.*", connector_source_name=~".*"}[2m])))
```

#### Panel 20: This chart focuses specifically on non-successful (non-2xx) ...
- **ID**: `panel_20`
- **Queries**: 0


## Section 4:  Request Characteristics: Router → Backend

### Panels: 2

#### Panel 21: Response Body Size
- **ID**: `panel_21`
- **Queries**: 2

##### Queries

**Query 0**: By Subgraph name
- **Metric**: `http.client.response.body.size`
```
histogram_avg(sum by (subgraph_name) (rate({otel_metric_name = "http.client.response.body.size", otel_metric_type = "histogram", connector_source_name!~".*"}[2m])))
```

**Query 1**: By name, name
- **Metric**: `http.client.response.body.size`
```
histogram_avg(sum by (subgraph_name, connector_source_name) (rate({otel_metric_name = "http.client.response.body.size", otel_metric_type = "histogram", connector_source_name=~".*"}[2m])))
```

#### Panel 22: This chart tracks the total volume of response data returned...
- **ID**: `panel_22`
- **Queries**: 0


## Section 5: Request Performance & Latency: Router → Backend

### Panels: 8

#### Panel 23: **Set Up Recommended SLOs & Alerts:**
- **ID**: `panel_23`
- **Queries**: 0

#### Panel 24: P95 Latency by Subgraph
- **ID**: `panel_24`
- **Queries**: 2

##### Queries

**Query 0**: By Subgraph name
- **Metric**: `http.client.request.duration`
```
histogram_quantile(0.95, sum by (subgraph_name, le) (rate({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", connector_source_name!~".*"}[2m])))
```

**Query 1**: By name, name
- **Metric**: `http.client.request.duration`
```
histogram_quantile(0.95, sum by (subgraph_name, connector_source_name, le) (rate({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", connector_source_name=~".*"}[2m])))
```

#### Panel 25: GraphQL Errors by Subgraph
- **ID**: `panel_25`
- **Queries**: 1

##### Queries

**Query 0**: By Subgraph name
- **Metric**: `http.client.request.duration`
```
histogram_sum(sum by (subgraph_name) (rate({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", connector_source_name!~".*", graphql_errors="true"}[2m])))
```

#### Panel 26: This chart tracks the 95th percentile (P95) request duration...
- **ID**: `panel_26`
- **Queries**: 0

#### Panel 27: This chart shows GraphQL errors by subgraph
- **ID**: `panel_27`
- **Queries**: 0

#### Panel 28: These charts aid in assessing the performance of individual ...
- **ID**: `panel_28`
- **Queries**: 0

#### Panel 29: These charts are a companion to the scatter plots to the lef...
- **ID**: `panel_29`
- **Queries**: 0

#### Panel 30: This chart shows the distribution of backend request duratio...
- **ID**: `panel_30`
- **Queries**: 0


## Section 6: Query Planning

### Panels: 5

#### Panel 31: The query planner is the heart of the runtime's computationa...
- **ID**: `panel_31`
- **Queries**: 0

#### Panel 32: Duration and Wait Time
- **ID**: `panel_32`
- **Queries**: 5

##### Queries

**Query 0**: Avg
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_avg(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m]))
```

**Query 1**: P95
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_quantile(0.95, sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m])))
```

**Query 2**: Max
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_avg(sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m])))
```

**Query 3**: Avg
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
histogram_avg(rate({otel_metric_name = "apollo.router.compute_jobs.queue.wait.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m]))
```

**Query 4**: Max
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
histogram_avg(sum(rate({otel_metric_name = "apollo.router.compute_jobs.queue.wait.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m])))
```

#### Panel 33: Evaluated Plans
- **ID**: `panel_33`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `apollo.router.query_planning.plan.evaluated_plans`
```
histogram_avg(rate({otel_metric_name = "apollo.router.query_planning.plan.evaluated_plans", otel_metric_type = "histogram"}[2m]))
```

**Query 1**: Max
- **Metric**: `apollo.router.query_planning.plan.evaluated_plans`
```
histogram_avg(sum(rate({otel_metric_name = "apollo.router.query_planning.plan.evaluated_plans", otel_metric_type = "histogram"}[2m])))
```

#### Panel 34: This chart tracks the wait and execution durations for query...
- **ID**: `panel_34`
- **Queries**: 0

#### Panel 35: This chart shows how many query plans are evaluated before s...
- **ID**: `panel_35`
- **Queries**: 0


## Section 7: Cache

### Panels: 11

#### Panel 36: Whenever your router receives an incoming GraphQL operation,...
- **ID**: `panel_36`
- **Queries**: 0

#### Panel 37: Misses vs. Record Count
- **ID**: `panel_37`
- **Queries**: 1

##### Queries

**Query 0**: Total
- **Metric**: `apollo.router.cache.miss.time`
```
sum(rate({otel_metric_name = "apollo.router.cache.miss.time", otel_metric_type = "histogram"}[2m]))
```

#### Panel 38: Record Counts by Instance
- **ID**: `panel_38`
- **Queries**: 1

##### Queries

**Query 0**: By host, pod_name, container_id
- **Metric**: `apollo.router.cache.size`
```
avg by (dash0_resource_name, dash0_resource_name, dash0_resource_id) ({otel_metric_name = "apollo.router.cache.size", otel_metric_type = "gauge"})
```

#### Panel 39: This chart shows an aggregate view across all cache types of...
- **ID**: `panel_39`
- **Queries**: 0

#### Panel 40: This chart breaks down the number of records in the cache of...
- **ID**: `panel_40`
- **Queries**: 0

#### Panel 41: Record Counts by Type
- **ID**: `panel_41`
- **Queries**: 1

##### Queries

**Query 0**: By kind, version
- **Metric**: `apollo.router.cache.size`
```
sum by (kind, version) ({otel_metric_name = "apollo.router.cache.size", otel_metric_type = "gauge"})
```

#### Panel 42: Misses by Type
- **ID**: `panel_42`
- **Queries**: 1

##### Queries

**Query 0**: By kind, version
- **Metric**: `apollo.router.cache.miss.time`
```
sum by (kind, version) (rate({otel_metric_name = "apollo.router.cache.miss.time", otel_metric_type = "histogram"}[2m]))
```

#### Panel 43: This chart shows cache record counts broken down by each cac...
- **ID**: `panel_43`
- **Queries**: 0

#### Panel 44: This chart shows cache misses broken down by cache type.
- **ID**: `panel_44`
- **Queries**: 0

#### Panel 45: Hit % by Instance
- **ID**: `panel_45`
- **Queries**: 2

##### Queries

**Query 0**: By host, pod_name, container_id
- **Metric**: `apollo.router.cache.hit.time`
```
sum by (dash0_resource_name, dash0_resource_name, dash0_resource_id) (rate({otel_metric_name = "apollo.router.cache.hit.time", otel_metric_type = "histogram"}[2m]))
```

**Query 1**: By host, pod_name, container_id
- **Metric**: `apollo.router.cache.miss.time`
```
sum by (dash0_resource_name, dash0_resource_name, dash0_resource_id) (rate({otel_metric_name = "apollo.router.cache.miss.time", otel_metric_type = "histogram"}[2m]))
```

#### Panel 46: This chart shows cache hit rate broken down by each individu...
- **ID**: `panel_46`
- **Queries**: 0


## Section 8: Compute Jobs

### Panels: 9

#### Panel 47: Compute jobs are CPU-intensive tasks that get managed on a d...
- **ID**: `panel_47`
- **Queries**: 0

#### Panel 48: Query Planning Duration Percentiles and Wait Time
- **ID**: `panel_48`
- **Queries**: 4

##### Queries

**Query 0**: P50
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_quantile(0.5, sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m])))
```

**Query 1**: P95
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_quantile(0.95, sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m])))
```

**Query 2**: P99
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_quantile(0.99, sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m])))
```

**Query 3**: Avg
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
histogram_avg(rate({otel_metric_name = "apollo.router.compute_jobs.queue.wait.duration", otel_metric_type = "histogram", job_type="query_planning"}[2m]))
```

#### Panel 49: Query Parsing Duration Percentiles and Wait Time
- **ID**: `panel_49`
- **Queries**: 4

##### Queries

**Query 0**: P50
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_quantile(0.5, sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_parsing"}[2m])))
```

**Query 1**: P95
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_quantile(0.95, sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_parsing"}[2m])))
```

**Query 2**: P99
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
histogram_quantile(0.99, sum(rate({otel_metric_name = "apollo.router.compute_jobs.execution.duration", otel_metric_type = "histogram", job_type="query_parsing"}[2m])))
```

**Query 3**: Avg
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
histogram_avg(rate({otel_metric_name = "apollo.router.compute_jobs.queue.wait.duration", otel_metric_type = "histogram", job_type="query_parsing"}[2m]))
```

#### Panel 50: This chart tracks the wait and execution durations for query...
- **ID**: `panel_50`
- **Queries**: 0

#### Panel 51: This chart tracks how long query parsing jobs take to execut...
- **ID**: `panel_51`
- **Queries**: 0

#### Panel 52: Queued Jobs
- **ID**: `panel_52`
- **Queries**: 1

##### Queries

**Query 0**: Sum
- **Metric**: `apollo.router.compute_jobs.queued`
```
sum({otel_metric_name = "apollo.router.compute_jobs.queued", otel_metric_type = "gauge"})
```

#### Panel 53: Job Counts by Outcome
- **ID**: `panel_53`
- **Queries**: 1

##### Queries

**Query 0**: By Job outcome
- **Metric**: `apollo.router.compute_jobs.duration`
```
histogram_sum(sum by (job_outcome) (increase({otel_metric_name = "apollo.router.compute_jobs.duration", otel_metric_type = "histogram"}[2m])))
```

#### Panel 54: This chart tracks the depth of the compute job queue over ti...
- **ID**: `panel_54`
- **Queries**: 0

#### Panel 55: This chart shows the total number of compute jobs actively r...
- **ID**: `panel_55`
- **Queries**: 0


## Section 9: Container/Host

### Panels: 13

#### Panel 56: Monitoring the resource consumption of your execution enviro...
- **ID**: `panel_56`
- **Queries**: 0

#### Panel 57: Kubernetes CPU Usage
- **ID**: `panel_57`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `kubernetes.cpu.usage.total`
```
avg({otel_metric_name = "kubernetes.cpu.usage.total", otel_metric_type = "sum"})
```

**Query 1**: Max
- **Metric**: `kubernetes.cpu.usage.total`
```
max(rate({otel_metric_name = "kubernetes.cpu.usage.total", otel_metric_type = "sum"}[2m]))
```

#### Panel 58: Host CPU Usage (OTEL Collector - Hostmetrics)
- **ID**: `panel_58`
- **Queries**: 5

##### Queries

**Query 0**: Avg
- **Metric**: `system.cpu.stolen`
```
avg({otel_metric_name = "system.cpu.stolen", otel_metric_type = "gauge"})
```

**Query 1**: Avg
- **Metric**: `system.cpu.iowait`
```
avg({otel_metric_name = "system.cpu.iowait", otel_metric_type = "gauge"})
```

**Query 2**: Avg
- **Metric**: `system.cpu.system`
```
avg({otel_metric_name = "system.cpu.system", otel_metric_type = "gauge"})
```

**Query 3**: Avg
- **Metric**: `system.cpu.user`
```
avg({otel_metric_name = "system.cpu.user", otel_metric_type = "gauge"})
```

**Query 4**: Avg
- **Metric**: `system.cpu.idle`
```
avg({otel_metric_name = "system.cpu.idle", otel_metric_type = "gauge"})
```

#### Panel 59: Docker CPU Usage (Datadog Docker Agent)
- **ID**: `panel_59`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `docker.cpu.usage`
```
avg({otel_metric_name = "docker.cpu.usage", otel_metric_type = "gauge"})
```

**Query 1**: Max
- **Metric**: `docker.cpu.usage`
```
max({otel_metric_name = "docker.cpu.usage", otel_metric_type = "gauge"})
```

#### Panel 60: Docker CPU Usage (OTEL Collector  - Docker/stats)
- **ID**: `panel_60`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `container.cpu.usage.total`
```
avg({otel_metric_name = "container.cpu.usage.total", otel_metric_type = "sum"})
```

**Query 1**: Max
- **Metric**: `container.cpu.usage.total`
```
max(rate({otel_metric_name = "container.cpu.usage.total", otel_metric_type = "sum"}[2m]))
```

#### Panel 61: Kubernetes Memory Usage
- **ID**: `panel_61`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `kubernetes.memory.usage`
```
avg({otel_metric_name = "kubernetes.memory.usage", otel_metric_type = "gauge"})
```

**Query 1**: Max
- **Metric**: `kubernetes.memory.usage`
```
max({otel_metric_name = "kubernetes.memory.usage", otel_metric_type = "gauge"})
```

#### Panel 62: Host Memory Usage (OTEL Collector - Hostmetrics)
- **ID**: `panel_62`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `system.mem.used`
```
avg({otel_metric_name = "system.mem.used", otel_metric_type = "gauge"})
```

**Query 1**: Max
- **Metric**: `system.mem.used`
```
max({otel_metric_name = "system.mem.used", otel_metric_type = "gauge"})
```

#### Panel 63: Docker Memory Usage (Datadog Docker Agent)
- **ID**: `panel_63`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `docker.mem.in_use`
```
avg({otel_metric_name = "docker.mem.in_use", otel_metric_type = "gauge"})
```

**Query 1**: Max
- **Metric**: `docker.mem.in_use`
```
max({otel_metric_name = "docker.mem.in_use", otel_metric_type = "gauge"})
```

#### Panel 64: Docker Memory Usage (OTEL Collector  - Docker/stats)
- **ID**: `panel_64`
- **Queries**: 2

##### Queries

**Query 0**: Avg
- **Metric**: `container.memory.usage.total`
```
avg({otel_metric_name = "container.memory.usage.total", otel_metric_type = "sum"})
```

**Query 1**: Max
- **Metric**: `container.memory.usage.total`
```
max(rate({otel_metric_name = "container.memory.usage.total", otel_metric_type = "sum"}[2m]))
```

#### Panel 65: These charts draw their threshold marker dynamically based o...
- **ID**: `panel_65`
- **Queries**: 0

#### Panel 66: The memory chart draws its threshold marker dynamically base...
- **ID**: `panel_66`
- **Queries**: 0

#### Panel 67: These charts draw their threshold marker dynamically based o...
- **ID**: `panel_67`
- **Queries**: 0

#### Panel 68: These charts draw their threshold marker dynamically based o...
- **ID**: `panel_68`
- **Queries**: 0


## Section 10: Coprocessors

### Panels: 7

#### Panel 69: If you incorporate [coprocessors](https://www.apollographql....
- **ID**: `panel_69`
- **Queries**: 0

#### Panel 70: Request Duration
- **ID**: `panel_70`
- **Queries**: 1

##### Queries

**Query 0**: By Coprocessor stage
- **Metric**: `apollo.router.operations.coprocessor.duration`
```
histogram_avg(sum by (coprocessor_stage) (rate({otel_metric_name = "apollo.router.operations.coprocessor.duration", otel_metric_type = "histogram"}[2m])))
```

#### Panel 71: Request Count
- **ID**: `panel_71`
- **Queries**: 1

##### Queries

**Query 0**: By Coprocessor stage
- **Metric**: `apollo.router.operations.coprocessor`
```
sum by (coprocessor_stage) (rate({otel_metric_name = "apollo.router.operations.coprocessor", otel_metric_type = "sum"}[2m]))
```

#### Panel 72: This chart shows the average duration added by coprocessor i...
- **ID**: `panel_72`
- **Queries**: 0

#### Panel 73: This chart breaks down how often coprocessors are invoked at...
- **ID**: `panel_73`
- **Queries**: 0

#### Panel 74: Success Rate
- **ID**: `panel_74`
- **Queries**: 2

##### Queries

**Query 0**: By Coprocessor stage
- **Metric**: `apollo.router.operations.coprocessor`
```
sum by (coprocessor_stage) (rate({otel_metric_name = "apollo.router.operations.coprocessor", otel_metric_type = "sum", coprocessor_succeeded="true"}[2m]))
```

**Query 1**: By Coprocessor stage
- **Metric**: `apollo.router.operations.coprocessor`
```
sum by (coprocessor_stage) (rate({otel_metric_name = "apollo.router.operations.coprocessor", otel_metric_type = "sum"}[2m]))
```

#### Panel 75: This chart tracks the success rate of coprocessor invocation...
- **ID**: `panel_75`
- **Queries**: 0


## Section 11: Sentinel Metrics

### Panels: 7

#### Panel 76: This section is a collection of assorted metrics that do not...
- **ID**: `panel_76`
- **Queries**: 0

#### Panel 77: Uplink and Licensing
- **ID**: `panel_77`
- **Queries**: 1

##### Queries

**Query 0**: Avg
- **Metric**: `apollo.router.uplink.fetch.duration.seconds`
```
histogram_avg(rate({otel_metric_name = "apollo.router.uplink.fetch.duration.seconds", otel_metric_type = "histogram"}[2m]))
```

#### Panel 78: Open Connections by Schema and Launch ID
- **ID**: `panel_78`
- **Queries**: 1

##### Queries

**Query 0**: By id, id
- **Metric**: `apollo.router.open_connections`
```
avg by (schema_id, launch_id) ({otel_metric_name = "apollo.router.open_connections", otel_metric_type = "gauge"})
```

#### Panel 79: [Uplink is used to retrieve your GraphOS license (where appl...
- **ID**: `panel_79`
- **Queries**: 0

#### Panel 80: This graph can help you track the rollout of schema changes ...
- **ID**: `panel_80`
- **Queries**: 0

#### Panel 81: Router Relative Overhead
- **ID**: `panel_81`
- **Queries**: 5

##### Queries

**Query 0**: Avg
- **Metric**: `http.server.request.duration`
```
histogram_avg(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m]))
```

**Query 1**: Avg
- **Metric**: `apollo.router.compute_jobs.duration`
```
histogram_avg(rate({otel_metric_name = "apollo.router.compute_jobs.duration", otel_metric_type = "histogram"}[2m]))
```

**Query 2**: Avg
- **Metric**: `apollo.router.operations.coprocessor.duration`
```
histogram_avg(rate({otel_metric_name = "apollo.router.operations.coprocessor.duration", otel_metric_type = "histogram"}[2m]))
```

**Query 3**: Avg
- **Metric**: `http.client.request.duration`
```
histogram_avg(rate({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram"}[2m]))
```

**Query 4**: Total
- **Metric**: `http.server.request.duration`
```
sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m]))
```

#### Panel 82: This graph measures the average delta between your runtime's...
- **ID**: `panel_82`
- **Queries**: 0


## Section 12: Resource Estimator

### Panels: 6

#### Panel 83: This section provides all of the metrics necessary to fill o...
- **ID**: `panel_83`
- **Queries**: 0

#### Panel 84: Average Request Rate
- **ID**: `panel_84`
- **Queries**: 1

##### Queries

**Query 0**: Total
- **Metric**: `http.server.request.duration`
```
sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m]))
```

#### Panel 85: Peak Request Rate
- **ID**: `panel_85`
- **Queries**: 1

##### Queries

**Query 0**: Total
- **Metric**: `http.server.request.duration`
```
sum(rate({otel_metric_name = "http.server.request.duration", otel_metric_type = "histogram"}[2m]))
```

#### Panel 86: Baseline Subgraph Latency
- **ID**: `panel_86`
- **Queries**: 1

##### Queries

**Query 0**: Avg
- **Metric**: `http.client.request.duration`
```
histogram_avg(sum by (subgraph_name) (rate({otel_metric_name = "http.client.request.duration", otel_metric_type = "histogram", subgraph_name=~".*"}[2m])))
```

#### Panel 87: Average Client Request Size
- **ID**: `panel_87`
- **Queries**: 1

##### Queries

**Query 0**: Avg
- **Metric**: `http.client.request.body.size`
```
histogram_avg(rate({otel_metric_name = "http.client.request.body.size", otel_metric_type = "histogram"}[2m]))
```

#### Panel 88: Average Client Response Size
- **ID**: `panel_88`
- **Queries**: 1

##### Queries

**Query 0**: Avg
- **Metric**: `http.client.response.body.size`
```
histogram_avg(rate({otel_metric_name = "http.client.response.body.size", otel_metric_type = "histogram"}[2m]))
```


