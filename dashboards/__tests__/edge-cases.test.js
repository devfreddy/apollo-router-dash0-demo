/**
 * Edge Case Tests for Dashboard Converters
 *
 * Tests for complex, real-world query patterns found in the Datadog GraphOS dashboard.
 * These test scenarios that are more challenging than basic unit tests.
 */

const { convertToPromQL } = require('../src/promql-converter');
const { convertWidget } = require('../src/widget-converter');
const metricTypeRules = require('../src/config/metric-types.json').rules;
const attributeMappings = require('../src/config/attribute-mappings.json').mappings;

describe('Edge Cases: Complex Filters and Multi-Grouping', () => {
  describe('Multiple Negative Filters', () => {
    it('should handle multiple negative status code filters', () => {
      const query = 'count:http.server.request.duration{$service,$env,$version,!http.response.status_code:2*,!http.response.status_code:4*}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('http_status_code!~"2.*"');
      expect(result).toContain('http_status_code!~"4.*"');
      expect(result).toContain('histogram_sum(sum(increase(');
    });

    it('should handle negative connector source filter with wildcard positive filter', () => {
      const query = 'count:http.client.request.duration{subgraph.name:*,!http.response.status_code:2*,$service,$env,$version,!connector.source.name:*} by {subgraph.name,http.response.status_code}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('subgraph_name=~');
      expect(result).toContain('http_status_code!~');
      expect(result).toContain('connector_source_name!~');
      expect(result).toContain('by (subgraph_name, http_status_code)');
    });
  });

  describe('Boolean Tag Filters', () => {
    it('should handle boolean true filters', () => {
      const query = 'count:http.server.request.duration{$service,$env,$version,graphql.errors:true}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('graphql_errors="true"');
      expect(result).toContain('histogram_sum(sum(increase(');
    });

    it('should handle license state filter', () => {
      const query = 'sum:apollo.router.lifecycle.license{$service,$env,$version,license.state:licensed}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('license_state="licensed"');
    });

    it('should handle job type filters', () => {
      const query = 'avg:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('job_type="query_planning"');
    });
  });

  describe('Three-Dimensional Grouping', () => {
    it('should handle three-way GROUP BY', () => {
      const query = 'count:http.client.request.duration{$service,$env,$version,connector.source.name:*} by {http.response.status_code,subgraph.name,connector.source.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('by (http_status_code, subgraph_name, connector_source_name)');
    });

    it('should handle infrastructure grouping (host, pod, container)', () => {
      const query = 'avg:apollo.router.cache.size{$service,$env,$version} by {host,pod_name,container_id}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      // host and pod_name both map to dash0_resource_name
      expect(result).toContain('dash0_resource_name');
      // container_id maps to dash0_resource_id
      expect(result).toContain('dash0_resource_id');
    });

    it('should handle schema and launch grouping', () => {
      const query = 'avg:apollo.router.open_connections{$service,$env,$version} by {schema.id,launch.id}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('by (schema_id, launch_id)');
    });

    it('should handle coprocessor stage grouping', () => {
      const query = 'avg:apollo.router.operations.coprocessor.duration{$service,$env,$version} by {coprocessor.stage}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('by (coprocessor_stage)');
    });
  });

  describe('Connector Source Name Patterns', () => {
    it('should handle positive connector source wildcard', () => {
      const query = 'count:http.client.request.duration{$service,$env,$version,connector.source.name:*} by {subgraph.name,connector.source.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('connector_source_name=~');
      expect(result).toContain('by (subgraph_name, connector_source_name)');
    });

    it('should handle negative connector source wildcard', () => {
      const query = 'count:http.client.request.duration{$service,$env,$version,!connector.source.name:*} by {subgraph.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('connector_source_name!~');
    });

    it('should handle mixed positive and negative connector patterns', () => {
      const query = 'count:http.client.response.body.size{$service,$env,$version,!connector.source.name:*} by {subgraph.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('connector_source_name!~');
      expect(result).toContain('by (subgraph_name)');
    });
  });

  describe('Mixed Wildcard and Exact Filters', () => {
    it('should handle subgraph wildcard with status code range', () => {
      const query = 'count:http.client.request.duration{subgraph.name:*,!http.response.status_code:2*,$service,$env,$version} by {subgraph.name,http.response.status_code}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('subgraph_name=~');
      expect(result).toContain('http_status_code!~"2.*"');
      expect(result).toContain('by (subgraph_name, http_status_code)');
    });
  });
});

describe('Edge Cases: Specialized Metrics', () => {
  describe('Cache Metrics', () => {
    it('should handle cache hit time with multiple grouping', () => {
      const query = 'count:apollo.router.cache.hit.time{$service,$env,$version} by {host,pod_name,container_id}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('apollo.router.cache.hit.time');
      // host and pod_name both map to dash0_resource_name
      expect(result).toContain('dash0_resource_name');
      // container_id maps to dash0_resource_id
      expect(result).toContain('dash0_resource_id');
    });

    it('should handle cache miss time with kind and version grouping', () => {
      const query = 'count:apollo.router.cache.miss.time{$service,$env,$version} by {kind,version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('apollo.router.cache.miss.time');
      expect(result).toContain('by (kind, version)');
    });

    it('should handle cache size with kind and version grouping', () => {
      const query = 'sum:apollo.router.cache.size{$service,$env,$version} by {kind,version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('otel_metric_type = "gauge"');
      expect(result).toContain('by (kind, version)');
    });
  });

  describe('Compute Jobs Metrics', () => {
    it('should handle queue wait duration with job type filter', () => {
      const query = 'avg:apollo.router.compute_jobs.queue.wait.duration{$service,$env,$version,job.type:query_planning}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('job_type="query_planning"');
      expect(result).toContain('apollo.router.compute_jobs.queue.wait.duration');
    });

    it('should handle execution duration with job outcome grouping', () => {
      const query = 'count:apollo.router.compute_jobs.duration{$service,$env,$version} by {job.outcome}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('by (job_outcome)');
    });
  });

  describe('Query Planning Metrics', () => {
    it('should handle evaluated plans percentile', () => {
      const query = 'max:apollo.router.query_planning.plan.evaluated_plans{$service,$env, $version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      // evaluated_plans is a histogram, max on histogram uses histogram_avg as workaround
      expect(result).toContain('histogram_avg');
      expect(result).toContain('rate(');
      expect(result).toContain('apollo.router.query_planning.plan.evaluated_plans');
    });

    it('should handle warmup duration count', () => {
      const query = 'count:apollo.router.query_planning.warmup.duration{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('apollo.router.query_planning.warmup.duration');
    });
  });

  describe('Coprocessor Metrics', () => {
    it('should handle coprocessor success rate calculation', () => {
      // This is part of a formula widget, but we test the individual queries
      const query0 = 'sum:apollo.router.operations.coprocessor{$service,$env,$version,coprocessor.succeeded:true} by {coprocessor.stage}.as_count()';
      const query1 = 'sum:apollo.router.operations.coprocessor{$service,$env,$version} by {coprocessor.stage}.as_count()';

      const result0 = convertToPromQL(query0, 'timeseries', metricTypeRules, attributeMappings);
      const result1 = convertToPromQL(query1, 'timeseries', metricTypeRules, attributeMappings);

      expect(result0).toContain('coprocessor_succeeded="true"');
      expect(result0).toContain('by (coprocessor_stage)');
      expect(result1).toContain('by (coprocessor_stage)');
    });
  });

  describe('License Metrics', () => {
    it('should handle license lifecycle with state filter', () => {
      const query = 'sum:apollo.router.lifecycle.license{$service,$env,$version,license.state:licensed}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('license_state="licensed"');
      expect(result).toContain('apollo.router.lifecycle.license');
    });

    it('should handle license without filter', () => {
      const query = 'sum:apollo.router.lifecycle.license{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('apollo.router.lifecycle.license');
    });
  });
});

describe('Edge Cases: Infrastructure Metrics', () => {
  describe('Container Metrics', () => {
    it('should handle container CPU usage', () => {
      const query = 'avg:container.cpu.usage.total{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('container.cpu.usage.total');
    });

    it('should handle container memory metrics', () => {
      const query = 'avg:container.memory.usage.total{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('container.memory.usage.total');
    });
  });

  describe('Docker Metrics', () => {
    it('should handle docker CPU limit', () => {
      const query = 'max:docker.cpu.limit{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('docker.cpu.limit');
    });
  });

  describe('Kubernetes Metrics', () => {
    it('should handle kubernetes CPU usage', () => {
      const query = 'avg:kubernetes.cpu.usage.total{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('kubernetes.cpu.usage.total');
    });

    it('should handle kubernetes memory usage', () => {
      const query = 'avg:kubernetes.memory.usage{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('kubernetes.memory.usage');
    });

    it('should handle kubernetes limits', () => {
      const query = 'max:kubernetes.cpu.limits{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('kubernetes.cpu.limits');
    });
  });

  describe('System Metrics', () => {
    it('should handle system CPU metrics', () => {
      const cpuMetrics = [
        'system.cpu.idle',
        'system.cpu.iowait',
        'system.cpu.stolen',
        'system.cpu.system',
        'system.cpu.user'
      ];

      cpuMetrics.forEach(metric => {
        const query = `avg:${metric}{$service,$env,$version}`;
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);
        expect(result).toContain(metric);
      });
    });

    it('should handle system memory metrics', () => {
      const query = 'avg:system.mem.used{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('system.mem.used');
    });
  });
});

describe('Edge Cases: Whitespace and Filter Format Variations', () => {
  it('should handle space in template variable list', () => {
    const query = 'avg:apollo.router.query_planning.plan.evaluated_plans{$service,$env, $version}';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    expect(result).toBeTruthy();
    expect(result).toContain('apollo.router.query_planning.plan.evaluated_plans');
  });

  it('should handle version template without explicit exclusion', () => {
    const query = 'avg:http.server.request.duration{$service,$env}';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    // Should work fine with just service and env
    expect(result).toBeTruthy();
    expect(result).toContain('http.server.request.duration');
  });
});

describe('Edge Cases: Specialized Query Patterns', () => {
  describe('Dual .as_count() with Grouping', () => {
    it('should handle as_count with two-way grouping', () => {
      const query = 'count:http.client.response.body.size{$service,$env,$version,connector.source.name:*} by {subgraph.name,connector.source.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_sum');
      expect(result).toContain('by (subgraph_name, connector_source_name)');
    });
  });

  describe('Error Tracking Patterns', () => {
    it('should handle graphql errors filter', () => {
      const query = 'sum:http.client.request.duration{$service,$env,$version,!connector.source.name:*, graphql.errors:true} by {subgraph.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('connector_source_name!~');
      expect(result).toContain('graphql_errors="true"');
    });
  });

  describe('Percentile with Job Type', () => {
    it('should handle p50 percentile with job type filter', () => {
      const query = 'p50:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_parsing}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_quantile(0.5');
      expect(result).toContain('job_type="query_parsing"');
    });

    it('should handle p99 percentile with job type filter', () => {
      const query = 'p99:apollo.router.compute_jobs.execution.duration{$service,$env,$version,job.type:query_planning}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_quantile(0.99');
      expect(result).toContain('job_type="query_planning"');
    });
  });

  describe('Body Size Metrics with Modifiers', () => {
    it('should handle request body size percentiles', () => {
      const query = 'p99:http.server.request.body.size{$service,$env,$version}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_quantile(0.99');
      expect(result).toContain('http.server.request.body.size');
    });

    it('should handle client response body size with as_count', () => {
      const query = 'avg:http.client.response.body.size{$service,$env,$version,!connector.source.name:*} by {subgraph.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('by (subgraph_name)');
      expect(result).toContain('connector_source_name!~');
    });
  });
});

describe('Edge Cases: Widget-Specific Conversions', () => {
  describe('Error Rate Calculation Widget', () => {
    it('should convert error rate widget with multiple queries', () => {
      const widget = {
        definition: {
          type: 'timeseries',
          title: 'Error Rate (%)',
          requests: [
            {
              queries: [
                { query: 'count:http.server.request.duration{$service,$env,$version,graphql.errors:true}.as_count()' },
                { query: 'count:http.server.request.duration{$service,$env,$version,!http.response.status_code:2*,!http.response.status_code:4*}.as_count()' },
                { query: 'count:http.server.request.duration{$service,$env,$version}.as_count()' }
              ]
            }
          ]
        }
      };

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).not.toBeNull();
      expect(result.spec.queries).toHaveLength(3);
      expect(result.spec.queries[0].spec.plugin.spec.query).toContain('graphql_errors="true"');
      expect(result.spec.queries[1].spec.plugin.spec.query).toContain('http_status_code!~');
    });
  });

  describe('Status Code Breakdown Widget', () => {
    it('should convert status code grouping widget', () => {
      const widget = {
        definition: {
          type: 'timeseries',
          title: 'Requests by Status Code',
          requests: [
            {
              queries: [
                { query: 'count:http.server.request.duration{$service,$env,$version} by {http.response.status_code}.as_count()' }
              ]
            }
          ]
        }
      };

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).not.toBeNull();
      expect(result.spec.queries[0].spec.plugin.spec.query).toContain('by (http_status_code)');
    });
  });

  describe('Subgraph Comparison Widget', () => {
    it('should convert multi-subgraph comparison', () => {
      const widget = {
        definition: {
          type: 'timeseries',
          title: 'Latency by Subgraph',
          requests: [
            {
              queries: [
                { query: 'p95:http.client.request.duration{$service,$env,$version,!connector.source.name:*} by {subgraph.name}' }
              ]
            }
          ]
        }
      };

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).not.toBeNull();
      expect(result.spec.queries[0].spec.plugin.spec.query).toContain('subgraph_name');
      expect(result.spec.queries[0].spec.plugin.spec.query).toContain('connector_source_name!~');
    });
  });
});

describe('Edge Cases: Real-World Query Patterns from GraphOS Dashboard', () => {
  it('should convert cache hit rate query (part 1 of formula)', () => {
    const query = 'count:apollo.router.cache.hit.time{$service,$env,$version}';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    expect(result).toContain('apollo.router.cache.hit.time');
    expect(result).toContain('sum(rate(');
  });

  it('should convert cache miss rate query (part 2 of formula)', () => {
    const query = 'count:apollo.router.cache.miss.time{$service,$env,$version}';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    expect(result).toContain('apollo.router.cache.miss.time');
  });

  it('should convert router throughput (requests per second)', () => {
    const query = 'count:http.server.request.duration{$service,$env,$version}.as_rate()';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    expect(result).toContain('sum(rate(');
    expect(result).toContain('[2m]');
  });

  it('should convert p90 latency query', () => {
    const query = 'p90:http.server.request.duration{$service,$env,$version}';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    expect(result).toContain('histogram_quantile(0.9');
  });

  it('should convert schema load monitoring', () => {
    const query = 'count:apollo.router.schema.load.duration{$service,$env,$version}';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    expect(result).toContain('apollo.router.schema.load.duration');
  });

  it('should convert uplink fetch duration monitoring', () => {
    const query = 'avg:apollo.router.uplink.fetch.duration.seconds{$service,$env,$version}';
    const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

    expect(result).toContain('apollo.router.uplink.fetch.duration.seconds');
  });
});
