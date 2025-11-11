# Datadog Dashboard Query Reference

**Generated**: 2025-11-11T03:06:41.660Z

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

### Panels: 4

#### Panel 0: Volume of Requests Per Status Code
- **ID**: `1224218507683046`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `http.server.request.duration`
```
count:http.server.request.duration{$service,$env,$version} by {http.response.status_code}.as_count()
```

#### Panel 1: Throughput: Requests Per Second
- **ID**: `5890661141790956`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `http.server.request.duration`
```
count:http.server.request.duration{$service,$env,$version}.as_count()
```

#### Panel 2: Error Rate Percent
- **ID**: `5348236615021926`
- **Queries**: 3

##### Queries

**Query 0**: query1
- **Metric**: `http.server.request.duration`
```
count:http.server.request.duration{$service,$env,$version,graphql.errors:true}.as_count()
```

**Query 1**: query2
- **Metric**: `http.server.request.duration`
```
count:http.server.request.duration{$service,$env,$version,!http.response.status_code:2*,!http.response.status_code:4*}.as_count()
```

**Query 2**: query3
- **Metric**: `http.server.request.duration`
```
count:http.server.request.duration{$service,$env,$version}.as_count()
```

#### Panel 3: GraphQL Errors by Operation
- **ID**: `8599343953934762`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `unknown`
```
undefined
```


## Section 1:  Request Characteristics: Client → Router

### Panels: 1

#### Panel 4: Request Body Size (p99 / Max)
- **ID**: `989162476390562`
- **Queries**: 2

##### Queries

**Query 0**: query1
- **Metric**: `http.server.request.body.size`
```
max:http.server.request.body.size{$service,$env,$version}
```

**Query 1**: query2
- **Metric**: `http.server.request.body.size`
```
p99:http.server.request.body.size{$service,$env,$version}
```


## Section 2: Request Performance & Latency: Client → Router

### Panels: 2

#### Panel 5: Request Duration Distribution
- **ID**: `5087230123283744`
- **Queries**: 0

#### Panel 6: Request Duration Percentiles
- **ID**: `73435209590847`
- **Queries**: 5

##### Queries

**Query 0**: query2
- **Metric**: `http.server.request.duration`
```
p99:http.server.request.duration{$service,$env,$version}
```

**Query 1**: query3
- **Metric**: `http.server.request.duration`
```
p95:http.server.request.duration{$service,$env,$version}
```

**Query 2**: query4
- **Metric**: `http.server.request.duration`
```
p90:http.server.request.duration{$service,$env,$version}
```

**Query 3**: query5
- **Metric**: `http.server.request.duration`
```
min:http.server.request.duration{$service,$env,$version}
```

**Query 4**: query6
- **Metric**: `http.server.request.duration`
```
max:http.server.request.duration{$service,$env,$version}
```


## Section 3: Request Traffic & Health: Router → Backend

### Panels: 3

#### Panel 7: Http Requests by Status Code
- **ID**: `2856260301798283`
- **Queries**: 2

##### Queries

**Query 0**: query1
- **Metric**: `http.client.request.duration`
```
count:http.client.request.duration{$service,$env,$version,!connector.source.name:*} by {http.response.status_code,subgraph.name}.as_count()
```

**Query 1**: query2
- **Metric**: `http.client.request.duration`
```
count:http.client.request.duration{$service,$env,$version,connector.source.name:*} by {http.response.status_code,subgraph.name,connector.source.name}.as_count()
```

#### Panel 8: Throughput (Requests per Second)
- **ID**: `596214799597916`
- **Queries**: 2

##### Queries

**Query 0**: query1
- **Metric**: `http.client.request.duration`
```
count:http.client.request.duration{$service,$env,$version,!connector.source.name:*} by {subgraph.name}.as_rate()
```

**Query 1**: query2
- **Metric**: `http.client.request.duration`
```
count:http.client.request.duration{$service,$env,$version,connector.source.name:*} by {subgraph.name,connector.source.name}.as_rate()
```

#### Panel 9: Non-2xx Responses
- **ID**: `7352033193843851`
- **Queries**: 2

##### Queries

**Query 0**: query1
- **Metric**: `http.client.request.duration`
```
count:http.client.request.duration{subgraph.name:*,!http.response.status_code:2*,$service,$env,$version,!connector.source.name:*} by {subgraph.name,http.response.status_code}.as_count()
```

**Query 1**: query2
- **Metric**: `http.client.request.duration`
```
count:http.client.request.duration{subgraph.name:*,!http.response.status_code:2*,$service,$env,$version,connector.source.name:*} by {subgraph.name,http.response.status_code,connector.source.name}.as_count()
```


## Section 4:  Request Characteristics: Router → Backend

### Panels: 1

#### Panel 10: Response Body Size
- **ID**: `5598171919490974`
- **Queries**: 2

##### Queries

**Query 0**: query4
- **Metric**: `http.client.response.body.size`
```
avg:http.client.response.body.size{$service,$env,$version,!connector.source.name:*} by {subgraph.name}.as_count()
```

**Query 1**: query1
- **Metric**: `http.client.response.body.size`
```
avg:http.client.response.body.size{$service,$env,$version,connector.source.name:*} by {subgraph.name,connector.source.name}.as_count()
```


## Section 5: Request Performance & Latency: Router → Backend

### Panels: 3

#### Panel 11: P95 Latency by Subgraph
- **ID**: `8695944198127783`
- **Queries**: 2

##### Queries

**Query 0**: query1
- **Metric**: `http.client.request.duration`
```
p95:http.client.request.duration{$service,$env,$version,!connector.source.name:*} by {subgraph.name}
```

**Query 1**: query2
- **Metric**: `http.client.request.duration`
```
p95:http.client.request.duration{$service,$env,$version,connector.source.name:*} by {subgraph.name,connector.source.name}
```

#### Panel 12: GraphQL Errors by Subgraph
- **ID**: `2531855480044862`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `sum`
```
sum:http.client.request.duration{$service,$env,$version,!connector.source.name:*, graphql.errors:true} by {subgraph.name}.as_count()
```

#### Panel 13: Request Duration Distribution
- **ID**: `7867354547639656`
- **Queries**: 0


## Section 6: Query Planning

### Panels: 2

#### Panel 14: Duration and Wait Time
- **ID**: `7301212877184944`
- **Queries**: 7

##### Queries

**Query 0**: query2
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
avg:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}
```

**Query 1**: query1
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
p95:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}
```

**Query 2**: query3
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
max:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}
```

**Query 3**: query4
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
avg:apollo.router.compute_jobs.queue.wait.duration{$service,$env,$version,job.type:query_planning}
```

**Query 4**: query5
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
max:apollo.router.compute_jobs.queue.wait.duration{$service,$env,$version,job.type:query_planning}
```

**Query 5**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```

**Query 6**: query1
- **Metric**: `apollo.router.query_planning.warmup.duration`
```
count:apollo.router.query_planning.warmup.duration{$service,$env,$version}
```

#### Panel 15: Evaluated Plans
- **ID**: `3371314754887370`
- **Queries**: 4

##### Queries

**Query 0**: query2
- **Metric**: `apollo.router.query_planning.plan.evaluated_plans`
```
avg:apollo.router.query_planning.plan.evaluated_plans{$service,$env, $version}
```

**Query 1**: query1
- **Metric**: `apollo.router.query_planning.plan.evaluated_plans`
```
max:apollo.router.query_planning.plan.evaluated_plans{$service,$env, $version}
```

**Query 2**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```

**Query 3**: query1
- **Metric**: `apollo.router.query_planning.warmup.duration`
```
count:apollo.router.query_planning.warmup.duration{$service,$env,$version}
```


## Section 7: Cache

### Panels: 5

#### Panel 16: Misses vs. Record Count
- **ID**: `280811115102223`
- **Queries**: 6

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.cache.miss.time`
```
count:apollo.router.cache.miss.time{$service,$env,$version}
```

**Query 1**: query0
- **Metric**: `apollo.router.cache.size`
```
avg:apollo.router.cache.size{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `apollo.router.cache.hit.time`
```
count:apollo.router.cache.hit.time{$service,$env,$version}
```

**Query 3**: query1
- **Metric**: `apollo.router.cache.miss.time`
```
count:apollo.router.cache.miss.time{$service,$env,$version}
```

**Query 4**: query1
- **Metric**: `apollo.router.query_planning.warmup.duration`
```
count:apollo.router.query_planning.warmup.duration{$service,$env,$version}
```

**Query 5**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```

#### Panel 17: Record Counts by Instance
- **ID**: `5973444432338869`
- **Queries**: 3

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.cache.size`
```
avg:apollo.router.cache.size{$service,$env,$version} by {host,pod_name,container_id}
```

**Query 1**: query1
- **Metric**: `apollo.router.query_planning.warmup.duration`
```
count:apollo.router.query_planning.warmup.duration{$service,$env,$version}
```

**Query 2**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```

#### Panel 18: Record Counts by Type
- **ID**: `8120174499044240`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `sum`
```
sum:apollo.router.cache.size{$service,$env,$version} by {kind,version}
```

#### Panel 19: Misses by Type
- **ID**: `8691777953686757`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.cache.miss.time`
```
count:apollo.router.cache.miss.time{$service,$env,$version} by {kind,version}
```

#### Panel 20: Hit % by Instance
- **ID**: `7905054550039923`
- **Queries**: 2

##### Queries

**Query 0**: query0
- **Metric**: `apollo.router.cache.hit.time`
```
count:apollo.router.cache.hit.time{$service,$env,$version} by {host,pod_name,container_id}
```

**Query 1**: query1
- **Metric**: `apollo.router.cache.miss.time`
```
count:apollo.router.cache.miss.time{$service,$env,$version} by {host,pod_name,container_id}
```


## Section 8: Compute Jobs

### Panels: 4

#### Panel 21: Query Planning Duration Percentiles and Wait Time
- **ID**: `2242335784104899`
- **Queries**: 6

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
p50:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}
```

**Query 1**: query3
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
p95:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}
```

**Query 2**: query2
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
p99:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}
```

**Query 3**: query4
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
avg:apollo.router.compute_jobs.queue.wait.duration{$service,$env,$version,job.type:query_planning}
```

**Query 4**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```

**Query 5**: query1
- **Metric**: `apollo.router.query_planning.warmup.duration`
```
count:apollo.router.query_planning.warmup.duration{$service,$env,$version}
```

#### Panel 22: Query Parsing Duration Percentiles and Wait Time
- **ID**: `6504562094582051`
- **Queries**: 6

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
p50:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_parsing}
```

**Query 1**: query3
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
p95:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_parsing}
```

**Query 2**: query2
- **Metric**: `apollo.router.compute_jobs.execution.duration`
```
p99:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_parsing}
```

**Query 3**: query4
- **Metric**: `apollo.router.compute_jobs.queue.wait.duration`
```
avg:apollo.router.compute_jobs.queue.wait.duration{$service,$env,$version,job.type:query_parsing}
```

**Query 4**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```

**Query 5**: query1
- **Metric**: `apollo.router.query_planning.warmup.duration`
```
count:apollo.router.query_planning.warmup.duration{$service,$env,$version}
```

#### Panel 23: Queued Jobs
- **ID**: `2646683015980845`
- **Queries**: 2

##### Queries

**Query 0**: query1
- **Metric**: `sum`
```
sum:apollo.router.compute_jobs.queued{$service,$env,$version}
```

**Query 1**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```

#### Panel 24: Job Counts by Outcome
- **ID**: `3496774608895013`
- **Queries**: 2

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.compute_jobs.duration`
```
count:apollo.router.compute_jobs.duration{$service,$env,$version} by {job.outcome}.as_count()
```

**Query 1**: query1
- **Metric**: `apollo.router.schema.load.duration`
```
count:apollo.router.schema.load.duration{$service,$env,$version}
```


## Section 9: Container/Host

### Panels: 8

#### Panel 25: Kubernetes CPU Usage
- **ID**: `7198505991257678`
- **Queries**: 4

##### Queries

**Query 0**: query1
- **Metric**: `kubernetes.cpu.usage.total`
```
avg:kubernetes.cpu.usage.total{$service,$env,$version}
```

**Query 1**: query2
- **Metric**: `kubernetes.cpu.usage.total`
```
max:kubernetes.cpu.usage.total{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `kubernetes.cpu.limits`
```
max:kubernetes.cpu.limits{$service,$env,$version}
```

**Query 3**: query1
- **Metric**: `kubernetes.cpu.limits`
```
min:kubernetes.cpu.limits{$service,$env,$version}
```

#### Panel 26: Host CPU Usage (OTEL Collector - Hostmetrics)
- **ID**: `4808663335885167`
- **Queries**: 5

##### Queries

**Query 0**: query2
- **Metric**: `system.cpu.stolen`
```
avg:system.cpu.stolen{$service,$env,$version}
```

**Query 1**: query1
- **Metric**: `system.cpu.iowait`
```
avg:system.cpu.iowait{$service,$env,$version}
```

**Query 2**: query3
- **Metric**: `system.cpu.system`
```
avg:system.cpu.system{$service,$env,$version}
```

**Query 3**: query4
- **Metric**: `system.cpu.user`
```
avg:system.cpu.user{$service,$env,$version}
```

**Query 4**: query5
- **Metric**: `system.cpu.idle`
```
avg:system.cpu.idle{$service,$env,$version}
```

#### Panel 27: Docker CPU Usage (Datadog Docker Agent)
- **ID**: `3871424817397328`
- **Queries**: 3

##### Queries

**Query 0**: query3
- **Metric**: `docker.cpu.usage`
```
avg:docker.cpu.usage{$service,$env,$version}
```

**Query 1**: query1
- **Metric**: `docker.cpu.usage`
```
max:docker.cpu.usage{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `docker.cpu.limit`
```
avg:docker.cpu.limit{$service,$env,$version}
```

#### Panel 28: Docker CPU Usage (OTEL Collector  - Docker/stats)
- **ID**: `7178237105285863`
- **Queries**: 4

##### Queries

**Query 0**: query1
- **Metric**: `container.cpu.usage.total`
```
avg:container.cpu.usage.total{$service,$env,$version}
```

**Query 1**: query2
- **Metric**: `container.cpu.usage.total`
```
max:container.cpu.usage.total{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `container.cpu.limit`
```
min:container.cpu.limit{$service,$env,$version}
```

**Query 3**: query1
- **Metric**: `container.cpu.limit`
```
max:container.cpu.limit{$service,$env,$version}
```

#### Panel 29: Kubernetes Memory Usage
- **ID**: `1123646347411335`
- **Queries**: 4

##### Queries

**Query 0**: query1
- **Metric**: `kubernetes.memory.usage`
```
avg:kubernetes.memory.usage{$service,$env,$version}
```

**Query 1**: query2
- **Metric**: `kubernetes.memory.usage`
```
max:kubernetes.memory.usage{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `kubernetes.memory.limits`
```
min:kubernetes.memory.limits{$service,$env,$version}
```

**Query 3**: query1
- **Metric**: `kubernetes.memory.limits`
```
max:kubernetes.memory.limits{$service,$env,$version}
```

#### Panel 30: Host Memory Usage (OTEL Collector - Hostmetrics)
- **ID**: `7061503711231094`
- **Queries**: 4

##### Queries

**Query 0**: query1
- **Metric**: `system.mem.used`
```
avg:system.mem.used{$service,$env,$version}
```

**Query 1**: query2
- **Metric**: `system.mem.used`
```
max:system.mem.used{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `system.mem.total`
```
min:system.mem.total{$service,$env,$version}
```

**Query 3**: query1
- **Metric**: `system.mem.total`
```
max:system.mem.total{$service,$env,$version}
```

#### Panel 31: Docker Memory Usage (Datadog Docker Agent)
- **ID**: `3525357882872541`
- **Queries**: 3

##### Queries

**Query 0**: query1
- **Metric**: `docker.mem.in_use`
```
avg:docker.mem.in_use{$service,$env,$version}
```

**Query 1**: query2
- **Metric**: `docker.mem.in_use`
```
max:docker.mem.in_use{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `docker.mem.limit`
```
avg:docker.mem.limit{$service,$env,$version}
```

#### Panel 32: Docker Memory Usage (OTEL Collector  - Docker/stats)
- **ID**: `6913818230766855`
- **Queries**: 3

##### Queries

**Query 0**: query1
- **Metric**: `container.memory.usage.total`
```
avg:container.memory.usage.total{$service,$env,$version}
```

**Query 1**: query2
- **Metric**: `container.memory.usage.total`
```
max:container.memory.usage.total{$service,$env,$version}
```

**Query 2**: query0
- **Metric**: `container.memory.usage.limit`
```
avg:container.memory.usage.limit{$service,$env,$version}
```


## Section 10: Coprocessors

### Panels: 3

#### Panel 33: Request Duration
- **ID**: `7202644430123243`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.operations.coprocessor.duration`
```
avg:apollo.router.operations.coprocessor.duration{$service,$env,$version} by {coprocessor.stage}
```

#### Panel 34: Request Count
- **ID**: `8422381032516479`
- **Queries**: 1

##### Queries

**Query 0**: query0
- **Metric**: `sum`
```
sum:apollo.router.operations.coprocessor{$service,$env,$version} by {coprocessor.stage}.as_count()
```

#### Panel 35: Success Rate
- **ID**: `1752147216961256`
- **Queries**: 2

##### Queries

**Query 0**: query0
- **Metric**: `sum`
```
sum:apollo.router.operations.coprocessor{$service,$env,$version,coprocessor.succeeded:true} by {coprocessor.stage}.as_count()
```

**Query 1**: query1
- **Metric**: `sum`
```
sum:apollo.router.operations.coprocessor{$service,$env,$version} by {coprocessor.stage}.as_count()
```


## Section 11: Sentinel Metrics

### Panels: 3

#### Panel 36: Uplink and Licensing
- **ID**: `6734123939129048`
- **Queries**: 3

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.uplink.fetch.duration.seconds`
```
avg:apollo.router.uplink.fetch.duration.seconds{$service,$env,$version}
```

**Query 1**: query1
- **Metric**: `sum`
```
sum:apollo.router.lifecycle.license{$service,$env,$version,license.state:licensed}
```

**Query 2**: query2
- **Metric**: `sum`
```
sum:apollo.router.lifecycle.license{$service,$env,$version}
```

#### Panel 37: Open Connections by Schema and Launch ID
- **ID**: `850320612557659`
- **Queries**: 1

##### Queries

**Query 0**: query1
- **Metric**: `apollo.router.open_connections`
```
avg:apollo.router.open_connections{$service,$env,$version} by {schema.id,launch.id}
```

#### Panel 38: Router Relative Overhead
- **ID**: `1270431771452126`
- **Queries**: 5

##### Queries

**Query 0**: query6
- **Metric**: `http.server.request.duration`
```
avg:http.server.request.duration{$service,$env}
```

**Query 1**: query2
- **Metric**: `apollo.router.compute_jobs.duration`
```
avg:apollo.router.compute_jobs.duration{$service,$env}
```

**Query 2**: query5
- **Metric**: `apollo.router.operations.coprocessor.duration`
```
avg:apollo.router.operations.coprocessor.duration{$service,$env}
```

**Query 3**: query4
- **Metric**: `http.client.request.duration`
```
avg:http.client.request.duration{$service,$env}
```

**Query 4**: query3
- **Metric**: `http.server.request.duration`
```
count:http.server.request.duration{$service,$env}.as_rate()
```


## Section 12: Resource Estimator

### Panels: 0


