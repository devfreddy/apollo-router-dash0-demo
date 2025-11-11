/**
 * Tests for metric-type.js
 *
 * Tests the metric type detection logic that determines whether a metric
 * is a histogram, gauge, or sum based on its name and configuration rules.
 */

const { getMetricType } = require('../src/metric-type');

// Load the actual metric type rules from config
const metricTypeRules = require('../src/config/metric-types.json').rules;

describe('getMetricType', () => {
  describe('Histogram Detection', () => {
    it('should detect duration metrics as histogram', () => {
      expect(getMetricType('http.server.request.duration', metricTypeRules)).toBe('histogram');
      expect(getMetricType('graphql.request.duration', metricTypeRules)).toBe('histogram');
      expect(getMetricType('query.duration', metricTypeRules)).toBe('histogram');
    });

    it('should detect .time metrics as histogram', () => {
      expect(getMetricType('elapsed.time', metricTypeRules)).toBe('histogram');
      expect(getMetricType('response.time', metricTypeRules)).toBe('histogram');
      expect(getMetricType('processing.time', metricTypeRules)).toBe('histogram');
    });

    it('should detect body.size metrics as histogram', () => {
      expect(getMetricType('request.body.size', metricTypeRules)).toBe('histogram');
      expect(getMetricType('response.body.size', metricTypeRules)).toBe('histogram');
      expect(getMetricType('http.request.body', metricTypeRules)).toBe('histogram');
    });

    it('should detect query planning metrics as histogram', () => {
      expect(getMetricType('query.evaluated_plans', metricTypeRules)).toBe('histogram');
      expect(getMetricType('evaluated_paths', metricTypeRules)).toBe('histogram');
    });
  });

  describe('Cache Size Exception', () => {
    it('should detect apollo.router.cache.size as gauge (exception)', () => {
      // This is critical - despite having "size" in the name,
      // cache.size is a gauge (current value), not a histogram (distribution)
      expect(getMetricType('apollo.router.cache.size', metricTypeRules)).toBe('gauge');
    });

    it('should still detect other size metrics as histogram', () => {
      // Note: These actually return gauge because cache.type/cache.storage pattern
      // matches before body.size pattern, OR they don't match any specific rule
      // and fall back to default gauge
      expect(getMetricType('payload.body.size', metricTypeRules)).toBe('histogram');
      expect(getMetricType('request.body.size', metricTypeRules)).toBe('histogram');
    });
  });

  describe('Sum Detection', () => {
    it('should detect operations metrics as sum', () => {
      expect(getMetricType('graphql_operations', metricTypeRules)).toBe('sum');
      expect(getMetricType('http.operations', metricTypeRules)).toBe('sum');
    });

    it('should detect error metrics as sum', () => {
      expect(getMetricType('graphql_error.count', metricTypeRules)).toBe('sum');
      expect(getMetricType('graphql_errors', metricTypeRules)).toBe('sum');
    });

    it('should detect .total metrics as sum', () => {
      expect(getMetricType('requests.total', metricTypeRules)).toBe('sum');
      expect(getMetricType('errors.count.total', metricTypeRules)).toBe('sum');
    });

    it('should detect active_requests and active_jobs as sum', () => {
      expect(getMetricType('active_requests', metricTypeRules)).toBe('sum');
      expect(getMetricType('active_jobs', metricTypeRules)).toBe('sum');
    });
  });

  describe('Gauge Detection', () => {
    it('should detect cache-related metrics as gauge', () => {
      expect(getMetricType('apollo.router.cache.type', metricTypeRules)).toBe('gauge');
      expect(getMetricType('cache.storage.used', metricTypeRules)).toBe('gauge');
    });

    it('should detect session metrics as gauge', () => {
      expect(getMetricType('active_sessions', metricTypeRules)).toBe('gauge');
      expect(getMetricType('session.count', metricTypeRules)).toBe('gauge');
    });

    it('should detect connection metrics as gauge', () => {
      expect(getMetricType('open_connections', metricTypeRules)).toBe('gauge');
    });

    it('should detect pipeline metrics as gauge', () => {
      expect(getMetricType('active_pipelines', metricTypeRules)).toBe('gauge');
    });

    it('should detect license metrics as gauge', () => {
      expect(getMetricType('license.seats', metricTypeRules)).toBe('gauge');
    });

    it('should detect federation metrics as gauge', () => {
      expect(getMetricType('federation.subgraphs', metricTypeRules)).toBe('gauge');
    });

    it('should detect jemalloc metrics as gauge', () => {
      expect(getMetricType('jemalloc.memory.allocated', metricTypeRules)).toBe('gauge');
    });

    it('should detect queued metrics as gauge', () => {
      expect(getMetricType('requests.queued', metricTypeRules)).toBe('gauge');
    });
  });

  describe('Default Behavior', () => {
    it('should default to gauge for unknown metrics', () => {
      expect(getMetricType('unknown.metric', metricTypeRules)).toBe('gauge');
      expect(getMetricType('custom.application.metric', metricTypeRules)).toBe('gauge');
    });

    it('should handle empty metric name', () => {
      expect(getMetricType('', metricTypeRules)).toBe('gauge');
    });
  });

  describe('Rule Precedence', () => {
    it('should evaluate rules in order (exception before general)', () => {
      // apollo.router.cache.size matches both "duration" (via contains) and "cache"
      // but should use the exception rule first
      // Actually, "duration" doesn't contain "size", so this test is about
      // making sure exception rules (with exact match ^) take precedence
      expect(getMetricType('apollo.router.cache.size', metricTypeRules)).toBe('gauge');
    });

    it('should match first rule that applies', () => {
      // If a metric matches multiple patterns, the first rule should win
      // e.g., "graphql_operations" matches "operations" rule before default
      const result = getMetricType('graphql_operations', metricTypeRules);
      expect(result).toBe('sum');
    });
  });

  describe('Custom Rule Sets', () => {
    it('should work with custom rule definitions', () => {
      const customRules = [
        { pattern: '^custom\\.metric$', type: 'histogram' },
        { pattern: 'my_gauge', type: 'gauge' },
        { pattern: '*', type: 'sum' }
      ];

      expect(getMetricType('custom.metric', customRules)).toBe('histogram');
      expect(getMetricType('my_gauge_value', customRules)).toBe('gauge');
      expect(getMetricType('anything_else', customRules)).toBe('sum');
    });

    it('should handle rules without default rule', () => {
      const rulesWithoutDefault = [
        { pattern: 'histogram_pattern', type: 'histogram' },
        { pattern: 'gauge_pattern', type: 'gauge' }
      ];

      // Without a default rule matching '*', it should fallback to 'gauge'
      expect(getMetricType('unknown', rulesWithoutDefault)).toBe('gauge');
    });
  });

  describe('Edge Cases', () => {
    it('should handle metrics with multiple matching patterns', () => {
      // "request.duration" matches both "duration" and "request.body"
      // Should match "duration" first since it's earlier in the rules
      expect(getMetricType('request.duration', metricTypeRules)).toBe('histogram');
    });

    it('should handle case-sensitive matching', () => {
      // The rules are case-sensitive
      expect(getMetricType('Duration', metricTypeRules)).not.toBe('histogram');
      expect(getMetricType('HTTP.SERVER.REQUEST.DURATION', metricTypeRules)).not.toBe('histogram');
    });

    it('should handle metrics with special characters', () => {
      expect(getMetricType('http.server.request.duration', metricTypeRules)).toBe('histogram');
      expect(getMetricType('metric_with_underscores', metricTypeRules)).toBe('gauge');
      expect(getMetricType('metric-with-dashes', metricTypeRules)).toBe('gauge');
    });
  });

  describe('Real World Examples', () => {
    it('should correctly classify Apollo Router metrics', () => {
      const testCases = [
        // Histograms (duration metrics)
        { metric: 'http.server.request.duration', expected: 'histogram' },
        // Sums (counters)
        { metric: 'graphql.request.count.total', expected: 'sum' },
        // Gauges
        { metric: 'apollo.router.cache.size', expected: 'gauge' },
        { metric: 'active_sessions', expected: 'gauge' },
        // Default
        { metric: 'custom_application_metric', expected: 'gauge' }
      ];

      testCases.forEach(({ metric, expected }) => {
        expect(getMetricType(metric, metricTypeRules)).toBe(expected);
      });
    });
  });
});
