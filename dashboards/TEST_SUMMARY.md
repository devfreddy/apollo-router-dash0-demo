# Test Suite Summary - Edge Cases & Real-World Patterns

## New Edge Case Test File: `__tests__/edge-cases.test.js`

Added comprehensive tests based on analysis of the actual Datadog GraphOS template dashboard.

### Test Coverage: 48 tests covering real-world scenarios

#### Complex Filters and Multi-Grouping (13 tests)
- **Multiple negative filters**: Status code exclusion patterns (2xx*, 4xx*)
- **Connector source patterns**: Positive/negative wildcard combinations
- **Boolean tag filters**: `graphql.errors:true`, `license.state:licensed`, `job.type:query_planning`
- **Three-dimensional grouping**: Infrastructure labels (host, pod_name, container_id), schema/launch IDs, coprocessor stages

#### Specialized Metrics (12 tests)
- **Cache metrics**: Hit time, miss time, size with various groupings
- **Compute jobs**: Queue wait duration, execution duration with job type/outcome filters
- **Query planning**: Evaluated plans, warmup duration
- **Coprocessor**: Success rate calculations with stage grouping
- **License**: Lifecycle metrics with state filtering
- **Infrastructure**: Container, Docker, Kubernetes, System metrics

#### Infrastructure Metrics (8 tests)
- CPU and memory metrics from Container, Docker, Kubernetes, and System sources
- Various aggregation patterns on infrastructure-level data

#### Widget-Specific Conversions (9 tests)
- Error rate calculation widgets (3 queries with formulas)
- Status code breakdown widgets
- Multi-subgraph comparison widgets
- Real-world panel conversions

#### Real-World Query Patterns (4 tests)
- Cache hit/miss rate monitoring
- Router throughput (requests per second)
- Latency percentiles (p90, p95, p99)
- Schema load and uplink monitoring

### Test Data Extracted From Dashboard

**82 unique metric queries analyzed:**
- Query patterns with 5+ filters
- Mixed positive/negative filter combinations
- Boolean tag filters
- Multiple grouping dimensions
- Various aggregation types (count, avg, sum, min, max, p50-p99)
- Modifier combinations (.as_rate(), .as_count())

### Key Edge Cases Tested

1. **Multiple Negation Patterns**
   ```
   !http.response.status_code:2*
   !http.response.status_code:4*
   !connector.source.name:*
   ```

2. **Complex Filter Combinations**
   ```
   count:http.client.request.duration{
     subgraph.name:*,
     !http.response.status_code:2*,
     $service,$env,$version,
     !connector.source.name:*
   } by {subgraph.name, http.response.status_code}.as_count()
   ```

3. **Three-Way Grouping**
   ```
   by {http.response.status_code, subgraph.name, connector.source.name}
   by {host, pod_name, container_id}
   by {schema.id, launch.id}
   ```

4. **Attribute Mapping in Complex Queries**
   - `http.response.status_code` → `http_status_code`
   - `connector.source.name` → `connector_source_name`
   - `host` → `dash0_resource_name`
   - `pod_name` → `dash0_resource_name`
   - `container_id` → `dash0_resource_id`

5. **Metric Type Awareness**
   - Histogram metrics (duration, evaluated_plans, body.size)
   - Gauge metrics (cache.size, open_connections)
   - Sum/Counter metrics (cache hits/misses, operations)

## Test Results

```
Test Suites: 5 passed, 5 total
Tests:       204 passed, 204 total
```

### Coverage Statistics

| Module | Statements | Branches | Functions | Lines |
|--------|------------|----------|-----------|-------|
| **attribute-mapper.js** | 100% | 100% | 100% | 100% |
| **metric-type.js** | 100% | 100% | 100% | 100% |
| **widget-converter.js** | 100% | 94.11% | 100% | 100% |
| **promql-converter.js** | 90.43% | 85.86% | 100% | 90.99% |
| **Overall** | **94.73%** | **89.93%** | **100%** | **95.02%** |

## Test Organization

### File Breakdown
- **metric-type.test.js** (18 tests) - Type detection edge cases
- **attribute-mapper.test.js** (19 tests) - Label mapping and GROUP BY extraction
- **promql-converter.test.js** (57 tests) - Query conversion logic
- **widget-converter.test.js** (62 tests) - Widget to panel conversion
- **edge-cases.test.js** (48 tests) - Real-world dashboard patterns

### Total Lines of Test Code: 2,000+ lines

## What's Covered

✅ All aggregation types (count, avg, sum, min, max, p50-p99)
✅ All filter patterns (exact, wildcard, negation, boolean)
✅ Multiple grouping dimensions (up to 3)
✅ Complex filter combinations
✅ Metric type awareness (histogram, gauge, sum)
✅ Label mapping and attribute conversions
✅ Template variable handling
✅ Widget type conversions
✅ Real-world Apollo Router metrics
✅ Infrastructure metrics (Container, Docker, Kubernetes, System)
✅ Special metrics (cache, compute jobs, query planning, coprocessor, license)
✅ Widget-specific patterns (multi-query, formula-based)

## Not Yet Covered

- Scatterplot widget specific configurations
- Distribution widget histogram aggregations
- Formula functions (anomalies, throughput, complex math)
- Spans/traces data source queries
- Advanced dashboard grouping strategies

## Running the Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm test -- edge-cases.test.js

# Tests matching pattern
npm test -- --testNamePattern="Multiple Negative Filters"
```

## Future Enhancements

1. Add tests for scatterplot x/y dimension formulas
2. Add tests for distribution widget configurations
3. Add tests for formula-based calculations (anomalies, throughput)
4. Add tests for spans/traces queries
5. Add integration tests with actual Dash0 API
