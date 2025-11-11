/**
 * Tests for attribute-mapper.js
 *
 * Tests the attribute name mapping logic that converts Datadog attribute names
 * to Dash0/PromQL-compatible names, and the GROUP BY extraction logic.
 */

const { mapAttributeName, extractGroupBy } = require('../src/attribute-mapper');
const attributeMappings = require('../src/config/attribute-mappings.json');

describe('mapAttributeName', () => {
  describe('Explicit Mappings', () => {
    it('should map explicitly defined attributes', () => {
      expect(mapAttributeName('http.response.status_code', attributeMappings.mappings)).toBe('http_status_code');
      expect(mapAttributeName('subgraph.name', attributeMappings.mappings)).toBe('subgraph_name');
    });

    it('should handle resource name mapping', () => {
      expect(mapAttributeName('host', attributeMappings.mappings)).toBe('dash0_resource_name');
      expect(mapAttributeName('pod_name', attributeMappings.mappings)).toBe('dash0_resource_name');
    });

    it('should map environment attribute', () => {
      expect(mapAttributeName('environment', attributeMappings.mappings)).toBe('env');
    });

    it('should map apollo_router_cache_kind', () => {
      expect(mapAttributeName('apollo_router_cache_kind', attributeMappings.mappings)).toBe('kind');
    });
  });

  describe('Default Dot-to-Underscore Conversion', () => {
    it('should convert dots to underscores for unmapped attributes', () => {
      expect(mapAttributeName('http.status', attributeMappings.mappings)).toBe('http_status');
      expect(mapAttributeName('graphql.operation', attributeMappings.mappings)).toBe('graphql_operation');
      expect(mapAttributeName('service.name', attributeMappings.mappings)).toBe('service_name');
    });

    it('should handle multiple dots', () => {
      expect(mapAttributeName('http.response.body.size', attributeMappings.mappings)).toBe('http_response_body_size');
    });

    it('should not modify attributes without dots', () => {
      expect(mapAttributeName('service', attributeMappings.mappings)).toBe('service');
      expect(mapAttributeName('status', attributeMappings.mappings)).toBe('status');
    });

    it('should handle underscores in attribute names', () => {
      expect(mapAttributeName('http_response_code', attributeMappings.mappings)).toBe('http_response_code');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(mapAttributeName('', attributeMappings.mappings)).toBe('');
    });

    it('should handle single word attributes', () => {
      expect(mapAttributeName('name', attributeMappings.mappings)).toBe('name');
    });

    it('should handle attributes with trailing dots', () => {
      expect(mapAttributeName('http.', attributeMappings.mappings)).toBe('http_');
    });

    it('should handle attributes with multiple consecutive dots', () => {
      expect(mapAttributeName('http..status', attributeMappings.mappings)).toBe('http__status');
    });
  });

  describe('Real World Examples', () => {
    it('should map common Datadog attributes correctly', () => {
      const testCases = [
        { input: 'http.response.status_code', expected: 'http_status_code' },
        { input: 'service.name', expected: 'service_name' },
        { input: 'environment', expected: 'env' },
        { input: 'custom.application.field', expected: 'custom_application_field' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(mapAttributeName(input, attributeMappings.mappings)).toBe(expected);
      });
    });
  });
});

describe('extractGroupBy', () => {
  const mappings = attributeMappings.mappings;

  describe('Explicit by {} Syntax', () => {
    it('should extract single grouping', () => {
      const query = 'count:http.request{service:api} by {service}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('service');
    });

    it('should extract multiple groupings', () => {
      const query = 'count:http.request{} by {service, environment}';
      const result = extractGroupBy(query, mappings);
      expect(result).toMatch(/service/);
      expect(result).toMatch(/env/);
    });

    it('should map attribute names in GROUP BY', () => {
      const query = 'count:http.request{} by {http.response.status_code}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('http_status_code');
    });

    it('should handle multiple attributes with mapping', () => {
      const query = 'count:http.request{} by {service, http.response.status_code, environment}';
      const result = extractGroupBy(query, mappings);
      const parts = result.split(', ');
      expect(parts).toContain('service');
      expect(parts).toContain('http_status_code');
      expect(parts).toContain('env');
    });

    it('should trim whitespace', () => {
      const query = 'count:http.request{} by {service,  environment  , status}';
      const result = extractGroupBy(query, mappings);
      const parts = result.split(', ');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('service');
      expect(parts[1]).toBe('env');
      expect(parts[2]).toBe('status');
    });
  });

  describe('Wildcard Filter Syntax', () => {
    it('should extract wildcard filters as grouping', () => {
      const query = 'count:http.request{service:*}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('service');
    });

    it('should handle multiple wildcard filters', () => {
      const query = 'count:http.request{service:*, environment:*}';
      const result = extractGroupBy(query, mappings);
      const parts = result.split(', ');
      expect(parts).toContain('service');
      expect(parts).toContain('env');
    });

    it('should handle both * and ? wildcards', () => {
      const query = 'count:http.request{service:*, status:?}';
      const result = extractGroupBy(query, mappings);
      expect(result).toMatch(/service/);
      expect(result).toMatch(/status/);
    });

    it('should map wildcard filter attributes', () => {
      const query = 'count:http.request{http.response.status_code:*}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('http_status_code');
    });
  });

  describe('Priority (by {} takes precedence over wildcards)', () => {
    it('should prefer explicit by {} syntax over wildcards', () => {
      // When both are present, by {} should be used
      const query = 'count:http.request{service:*, status:?} by {service}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('service');
    });
  });

  describe('No Grouping Cases', () => {
    it('should return empty string when no grouping present', () => {
      const query = 'count:http.request{service:api}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('');
    });

    it('should return empty string for empty query', () => {
      const result = extractGroupBy('', mappings);
      expect(result).toBe('');
    });

    it('should return empty string when no selector present', () => {
      const query = 'count:http.request';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('');
    });
  });

  describe('Complex Queries', () => {
    it('should extract from full Datadog query with modifiers', () => {
      const query = 'count:http.server.request.duration{$service} by {subgraph.name}.as_count()';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('subgraph_name');
    });

    it('should handle queries with multiple filters and grouping', () => {
      const query = 'p95:http.request{service:api, !status:500} by {method, path}';
      const result = extractGroupBy(query, mappings);
      const parts = result.split(', ');
      expect(parts).toContain('method');
      expect(parts).toContain('path');
    });

    it('should handle nested braces correctly', () => {
      // The regex should match the first complete selector
      const query = 'count:metric{a:b} by {x,y} extra{notused}';
      const result = extractGroupBy(query, mappings);
      expect(result).toMatch(/x/);
      expect(result).toMatch(/y/);
    });
  });

  describe('Real World Examples', () => {
    it('should extract grouping from Apollo Router queries', () => {
      const testCases = [
        {
          query: 'p95:http.server.request.duration{service:apollo-router} by {subgraph.name}',
          expected: 'subgraph_name'
        },
        {
          query: 'count:graphql.request{service:*}.as_rate()',
          expected: 'service'
        },
        {
          query: 'sum:apollo.router.cache.size{environment:prod, service:router} by {http.response.status_code}',
          expected: 'http_status_code'
        }
      ];

      testCases.forEach(({ query, expected }) => {
        expect(extractGroupBy(query, mappings)).toBe(expected);
      });
    });

    it('should handle queries with template variables', () => {
      const query = 'count:http.request{$service, $environment} by {method}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('method');
    });
  });

  describe('Edge Cases', () => {
    it('should handle attributes with hyphens', () => {
      const query = 'count:metric{} by {service-name}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('service-name');
    });

    it('should handle empty by clause', () => {
      const query = 'count:metric{} by {}';
      const result = extractGroupBy(query, mappings);
      // Empty by clause should return empty or just spaces
      expect(result.trim()).toBe('');
    });

    it('should not match non-wildcard filters in selector', () => {
      const query = 'count:metric{service:api, status:200}';
      const result = extractGroupBy(query, mappings);
      expect(result).toBe('');
    });
  });
});
