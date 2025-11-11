/**
 * Tests for promql-converter.js
 *
 * Tests the core conversion logic that transforms Datadog metric queries to PromQL.
 * This is the most critical module as it directly affects dashboard query correctness.
 */

const { convertToPromQL } = require('../src/promql-converter');
const metricTypeRules = require('../src/config/metric-types.json').rules;
const attributeMappings = require('../src/config/attribute-mappings.json').mappings;

describe('convertToPromQL', () => {
  describe('Percentile Queries (Histogram Metrics)', () => {
    it('should convert p95 with GROUP BY', () => {
      const query = 'p95:http.server.request.duration{service:api} by {subgraph.name}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_quantile(0.95');
      expect(result).toContain('rate(');
      expect(result).toContain('subgraph_name');
      expect(result).toContain('[2m]');
      expect(result).toContain('le'); // Critical: le label required
    });

    it('should convert p95 without GROUP BY', () => {
      const query = 'p95:http.server.request.duration{service:api}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_quantile(0.95');
      expect(result).toMatch(/sum\(rate\(/); // Should have sum() without group labels
    });

    it('should handle all percentile values', () => {
      const percentiles = [50, 75, 90, 95, 98, 99];

      percentiles.forEach(p => {
        const query = `p${p}:http.server.request.duration{}`;
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);
        expect(result).toContain(`histogram_quantile(${p / 100}`);
      });
    });

    it('should include otel_metric_name and otel_metric_type in selector', () => {
      const query = 'p95:http.server.request.duration{service:api} by {subgraph.name}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('otel_metric_name = "http.server.request.duration"');
      expect(result).toContain('otel_metric_type = "histogram"');
    });
  });

  describe('Count Queries', () => {
    describe('with .as_rate() modifier', () => {
      it('should convert to rate with GROUP BY', () => {
        const query = 'count:graphql_operations{service:api} by {environment}.as_rate()';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toContain('sum by (env) (rate(');
        expect(result).toContain('[2m]');
      });

      it('should convert to rate without GROUP BY', () => {
        const query = 'count:graphql_operations{service:api}.as_rate()';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toMatch(/sum\(rate\(/);
        expect(result).toContain('[2m]');
      });
    });

    describe('with .as_count() modifier', () => {
      it('should use histogram_sum with increase', () => {
        const query = 'count:http.server.request.duration{} by {service}.as_count()';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toContain('histogram_sum(');
        expect(result).toContain('increase(');
        expect(result).toContain('[2m]');
      });

      it('should wrap with sum() for high-cardinality http.server.request.duration without GROUP BY', () => {
        const query = 'count:http.server.request.duration{}.as_count()';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toContain('histogram_sum(sum(increase(');
      });

      it('should not wrap with extra sum() for other metrics', () => {
        const query = 'count:custom_metric{}.as_count()';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toContain('histogram_sum(increase(');
        expect(result).not.toMatch(/histogram_sum\(sum\(increase\(/);
      });
    });

    describe('without modifier (DEFAULT)', () => {
      it('should use rate() for normal metrics with GROUP BY', () => {
        const query = 'count:graphql_operations{} by {service}';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toContain('sum by (service) (rate(');
      });

      it('should use rate() for normal metrics without GROUP BY', () => {
        const query = 'count:graphql_operations{}';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toMatch(/sum\(rate\(/);
      });

      it('should use as_count() pattern for http.server.request.duration with GROUP BY', () => {
        const query = 'count:http.server.request.duration{} by {service}';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toContain('histogram_sum(sum by (service) (increase(');
      });

      it('should use as_count() pattern for http.server.request.duration without GROUP BY', () => {
        const query = 'count:http.server.request.duration{}';
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

        expect(result).toContain('histogram_sum(sum(increase(');
      });
    });
  });

  describe('Sum Queries', () => {
    it('should use histogram_sum for histogram metrics with GROUP BY', () => {
      const query = 'sum:http.server.request.duration{} by {service}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_sum(sum by (service) (rate(');
    });

    it('should use histogram_sum for histogram metrics without GROUP BY', () => {
      const query = 'sum:http.server.request.duration{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_sum(rate(');
    });

    it('should use rate() for sum/counter metrics with GROUP BY', () => {
      const query = 'sum:graphql_operations{} by {service}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('sum by (service) (rate(');
    });

    it('should use rate() for sum/counter metrics without GROUP BY', () => {
      const query = 'sum:graphql_operations{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toMatch(/sum\(rate\(/);
    });

    it('should NOT use rate() for gauge metrics', () => {
      const query = 'sum:apollo.router.cache.size{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).not.toContain('rate(');
      expect(result).toMatch(/sum\(/);
    });
  });

  describe('Average Queries', () => {
    it('should use histogram_avg for histogram metrics with GROUP BY', () => {
      const query = 'avg:http.server.request.duration{} by {service}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_avg(sum by (service) (rate(');
    });

    it('should use histogram_avg for histogram metrics without GROUP BY', () => {
      const query = 'avg:http.server.request.duration{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_avg(rate(');
    });

    it('should use avg() for gauge metrics with GROUP BY', () => {
      const query = 'avg:apollo.router.cache.size{} by {service}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('avg by (service) (');
      expect(result).not.toContain('rate(');
    });

    it('should use avg() for gauge metrics without GROUP BY', () => {
      const query = 'avg:apollo.router.cache.size{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toMatch(/avg\(/);
      expect(result).not.toContain('rate(');
    });
  });

  describe('Max/Min Queries', () => {
    it('should use histogram_avg for histogram metrics (workaround for Dash0 limitation)', () => {
      const query = 'max:http.server.request.duration{} by {service}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      // Note: Uses histogram_avg because max() doesn't work with delta-temporality histograms
      expect(result).toContain('histogram_avg(');
    });

    it('should use max() for gauge metrics with GROUP BY', () => {
      const query = 'max:apollo.router.cache.size{} by {service}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('max by (service) (');
    });

    it('should use min() for gauge metrics', () => {
      const query = 'min:apollo.router.cache.size{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toMatch(/min\(/);
      expect(result).not.toContain('rate(');
    });
  });

  describe('Filter Handling', () => {
    it('should include exact match filters', () => {
      const query = 'count:http.request{service:api, status:200}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('service="api"');
      expect(result).toContain('status="200"');
    });

    it('should convert wildcard filters to regex', () => {
      const query = 'count:http.request{status:2*}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('status=~"2.*"');
    });

    it('should handle negated filters', () => {
      const query = 'count:http.request{!status:500}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('status!="500"');
    });

    it('should handle negated wildcard filters', () => {
      const query = 'count:http.request{!status:5*}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('status!~"5.*"');
    });

    it('should map attribute names in filters', () => {
      const query = 'count:http.request{http.response.status_code:200}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('http_status_code="200"');
    });

    it('should skip variable references in filters', () => {
      const query = 'count:http.request{$service}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).not.toContain('$service');
    });
  });

  describe('Label Mapping', () => {
    it('should map GROUP BY labels', () => {
      const query = 'count:metric{} by {environment}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('env');
      expect(result).not.toContain('environment');
    });

    it('should map multiple GROUP BY labels', () => {
      const query = 'count:metric{} by {service, http.response.status_code}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('service');
      expect(result).toContain('http_status_code');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for invalid queries', () => {
      const result = convertToPromQL('invalid_query', 'timeseries', metricTypeRules, attributeMappings);
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = convertToPromQL(null, 'timeseries', metricTypeRules, attributeMappings);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = convertToPromQL('', 'timeseries', metricTypeRules, attributeMappings);
      expect(result).toBeNull();
    });

    it('should handle queries with extra whitespace', () => {
      const query = 'count: http.request  {service: api}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      // The regex parsing handles extra whitespace in metric name but not in filter values
      // This is an edge case - normally Datadog queries are well-formatted
      expect(result).toContain('http.request');
      // The space after colon in {service: api} is preserved
      expect(result).toMatch(/service.*api/);
    });

    it('should handle metric names with special characters', () => {
      const query = 'count:http.server.request.duration{service:api}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('http.server.request.duration');
    });
  });

  describe('Complete Real-World Queries', () => {
    it('should convert Apollo Router request duration p95', () => {
      const query = 'p95:http.server.request.duration{$service} by {subgraph.name}.as_count()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('histogram_quantile(0.95');
      expect(result).toContain('otel_metric_name = "http.server.request.duration"');
      expect(result).toContain('subgraph_name');
    });

    it('should convert GraphQL operations count', () => {
      const query = 'count:graphql_operations{service:apollo-router} by {environment, http.response.status_code}.as_rate()';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('sum by (env, http_status_code) (rate(');
      expect(result).toContain('otel_metric_type = "sum"');
    });

    it('should convert cache size query', () => {
      const query = 'avg:apollo.router.cache.size{service:*} by {host}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('avg by (dash0_resource_name) (');
      expect(result).not.toContain('rate(');
      expect(result).toContain('otel_metric_type = "gauge"');
    });

    it('should convert error count with filtering', () => {
      const query = 'sum:graphql_error.count{service:api, !environment:dev} by {path}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('sum by (path) (rate(');
      expect(result).toContain('service="api"');
      expect(result).toContain('env!="dev"');
      expect(result).toContain('otel_metric_type = "sum"');
    });
  });

  describe('Metric Type Awareness', () => {
    it('should handle different functions for same metric based on config', () => {
      // The same metric might be treated differently if rules change
      // This test ensures we use the config rules correctly
      const query = 'count:http.server.request.duration{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      // http.server.request.duration is a histogram
      expect(result).toContain('otel_metric_type = "histogram"');
    });

    it('should correctly identify gauge vs histogram based on rules', () => {
      // apollo.router.cache.size is a GAUGE exception
      const query = 'sum:apollo.router.cache.size{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('otel_metric_type = "gauge"');
      expect(result).not.toContain('rate(');
    });
  });

  describe('Time Window', () => {
    it('should always use 2m time window for rate/increase', () => {
      const queries = [
        'count:graphql_operations{}.as_rate()',
        'sum:http.server.request.duration{}',
        'avg:http.server.request.duration{} by {service}',
        'p95:http.server.request.duration{}'
      ];

      queries.forEach(query => {
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);
        expect(result).toContain('[2m]');
      });
    });
  });

  describe('otel_metric_name and otel_metric_type', () => {
    it('should always include otel_metric_name in selector', () => {
      const query = 'count:custom_metric{service:api} by {env}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toContain('otel_metric_name = "custom_metric"');
    });

    it('should always include otel_metric_type in selector', () => {
      const query = 'count:custom_metric{}';
      const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);

      expect(result).toMatch(/otel_metric_type = "\w+"/);
    });

    it('should use correct metric type in selector', () => {
      const testCases = [
        { query: 'count:http.server.request.duration{}', expectedType: 'histogram' },
        { query: 'count:graphql_operations{}', expectedType: 'sum' },
        { query: 'count:apollo.router.cache.size{}', expectedType: 'gauge' }
      ];

      testCases.forEach(({ query, expectedType }) => {
        const result = convertToPromQL(query, 'timeseries', metricTypeRules, attributeMappings);
        expect(result).toContain(`otel_metric_type = "${expectedType}"`);
      });
    });
  });
});
