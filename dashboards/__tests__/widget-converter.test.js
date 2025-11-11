/**
 * Tests for widget-converter.js
 *
 * Tests the widget-to-panel conversion logic that transforms Datadog widgets
 * to Perses panel format.
 */

const {
  generateQueryName,
  convertWidget,
  convertMarkdownWidget,
  extractWidgets
} = require('../src/widget-converter');

const metricTypeRules = require('../src/config/metric-types.json').rules;
const attributeMappings = require('../src/config/attribute-mappings.json').mappings;

describe('generateQueryName', () => {
  it('should generate query name for single GROUP BY', () => {
    const query = 'count:metric{service:api} by {service}';
    const result = generateQueryName(query, 'sum(rate(...))');

    expect(result).toMatch(/By.*[Ss]ervice/);
  });

  it('should generate query name for multiple GROUP BY', () => {
    const query = 'count:metric{} by {service, environment}';
    const result = generateQueryName(query, 'sum(rate(...))');

    expect(result).toMatch(/By.*service.*environment/);
  });

  it('should handle percentile queries', () => {
    const query = 'p95:metric{}';
    const result = generateQueryName(query, 'histogram_quantile(...)');

    // The function capitalizes p95 to P95
    expect(result).toMatch(/[pP]95/);
  });

  it('should map count to Total', () => {
    const query = 'count:metric{}';
    const result = generateQueryName(query, 'sum(rate(...))');

    expect(result).toContain('Total');
  });

  it('should return Query for invalid queries', () => {
    const result = generateQueryName('invalid', 'promql');
    expect(result).toBe('Query');
  });

  it('should capitalize aggregation name', () => {
    const query = 'sum:metric{}';
    const result = generateQueryName(query, 'promql');

    expect(result).toMatch(/^[A-Z]/);
  });

  it('should handle dot-separated attributes in GROUP BY', () => {
    const query = 'count:metric{} by {http.response.status}';
    const result = generateQueryName(query, 'promql');

    expect(result).toMatch(/[Ss]tatus/);
  });

  it('should handle camelCase attributes in GROUP BY', () => {
    const query = 'count:metric{} by {subgraphName}';
    const result = generateQueryName(query, 'promql');

    expect(result).toMatch(/Subgraph.*[Nn]ame/);
  });
});

describe('convertMarkdownWidget', () => {
  it('should convert note widget to markdown panel', () => {
    const widget = {
      definition: {
        type: 'note',
        content: 'This is a test note'
      }
    };

    const result = convertMarkdownWidget(widget);

    expect(result).not.toBeNull();
    expect(result.kind).toBe('Panel');
    expect(result.spec.plugin.kind).toBe('Markdown');
    expect(result.spec.plugin.spec.text).toBe('This is a test note');
  });

  it('should extract first line as title', () => {
    const widget = {
      definition: {
        type: 'note',
        content: 'First line\nSecond line\nThird line'
      }
    };

    const result = convertMarkdownWidget(widget);

    expect(result.spec.display.name).toBe('First line');
  });

  it('should truncate long titles to 60 chars', () => {
    const longContent = 'A'.repeat(70) + '\nSecond line';
    const widget = {
      definition: {
        type: 'note',
        content: longContent
      }
    };

    const result = convertMarkdownWidget(widget);

    expect(result.spec.display.name.length).toBeLessThanOrEqual(63); // 60 + '...'
    expect(result.spec.display.name).toContain('...');
  });

  it('should return null for empty content', () => {
    const widget = {
      definition: {
        type: 'note',
        content: ''
      }
    };

    const result = convertMarkdownWidget(widget);

    // Empty string is falsy, so the function returns null
    expect(result).toBeNull();
  });

  it('should set title with whitespace-only content', () => {
    const widget = {
      definition: {
        type: 'note',
        content: '   \nSecond line'
      }
    };

    const result = convertMarkdownWidget(widget);

    // First line is just spaces, creates a valid panel with that title
    expect(result).not.toBeNull();
    expect(result.spec.display.name).toBe('   ');
  });

  it('should set _isMarkdownPanel flag', () => {
    const widget = {
      definition: {
        type: 'note',
        content: 'Test'
      }
    };

    const result = convertMarkdownWidget(widget);

    expect(result._isMarkdownPanel).toBe(true);
  });

  it('should set hideHeader option to true', () => {
    const widget = {
      definition: {
        type: 'note',
        content: 'Test'
      }
    };

    const result = convertMarkdownWidget(widget);

    expect(result.spec.options.hideHeader).toBe(true);
  });

  it('should store Datadog layout if available', () => {
    const layout = { x: 0, y: 0, width: 4, height: 2 };
    const widget = {
      definition: {
        type: 'note',
        content: 'Test'
      },
      layout
    };

    const result = convertMarkdownWidget(widget);

    expect(result._datadogLayout).toEqual(layout);
  });

  it('should return null for non-note widgets', () => {
    const widget = {
      definition: {
        type: 'timeseries',
        content: 'Not a note'
      }
    };

    const result = convertMarkdownWidget(widget);

    expect(result).toBeNull();
  });

  it('should return null for note without content', () => {
    const widget = {
      definition: {
        type: 'note'
      }
    };

    const result = convertMarkdownWidget(widget);

    expect(result).toBeNull();
  });
});

describe('convertWidget', () => {
  const createWidget = (def) => ({ definition: def });

  describe('Timeseries Widgets', () => {
    it('should convert timeseries widget with single query', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Request Duration',
        requests: [
          {
            queries: [
              { query: 'p95:http.server.request.duration{service:api} by {subgraph.name}' }
            ]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).not.toBeNull();
      expect(result.kind).toBe('Panel');
      expect(result.spec.display.name).toBe('Request Duration');
      expect(result.spec.plugin.kind).toBe('TimeSeriesChart');
      expect(result.spec.queries.length).toBe(1);
    });

    it('should convert multiple queries in single widget', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Metrics',
        requests: [
          {
            queries: [
              { query: 'count:graphql_operations{} by {service}.as_rate()' },
              { query: 'p95:http.server.request.duration{} by {service}' }
            ]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.queries.length).toBe(2);
    });

    it('should set query kind to TimeSeriesQuery', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'count:metric{}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.queries[0].kind).toBe('TimeSeriesQuery');
    });

    it('should set plugin kind to PrometheusTimeSeriesQuery', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'count:metric{}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.queries[0].spec.plugin.kind).toBe('PrometheusTimeSeriesQuery');
    });

    it('should convert PromQL query', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'count:metric{service:api}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.queries[0].spec.plugin.spec.query).toContain('otel_metric_name');
      expect(result.spec.queries[0].spec.plugin.spec.query).toContain('service="api"');
    });

    it('should generate query names', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'count:metric{} by {service}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.queries[0].spec.display.name).toMatch(/By.*[Ss]ervice/);
    });

    it('should skip queries that fail to convert', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [
              { query: 'invalid_query' },
              { query: 'count:metric{}' }
            ]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      // Should only have 1 query (the valid one)
      expect(result.spec.queries.length).toBe(1);
    });

    it('should return null if no valid queries', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'invalid_query' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).toBeNull();
    });
  });

  describe('StatChart Widgets (query_value)', () => {
    it('should use StatChart plugin for query_value type', () => {
      const widget = createWidget({
        type: 'query_value',
        title: 'Cache Size',
        requests: [
          {
            queries: [{ query: 'avg:apollo.router.cache.size{}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.plugin.kind).toBe('StatChart');
    });

    it('should set StatChart calculation to mean', () => {
      const widget = createWidget({
        type: 'query_value',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'count:metric{}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.plugin.spec.calculation).toBe('mean');
    });
  });

  describe('Markdown Widgets', () => {
    it('should convert note widgets using convertMarkdownWidget', () => {
      const widget = createWidget({
        type: 'note',
        content: 'Documentation'
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).not.toBeNull();
      expect(result.spec.plugin.kind).toBe('Markdown');
    });
  });

  describe('Group Widgets', () => {
    it('should skip group widgets', () => {
      const widget = createWidget({
        type: 'group',
        widgets: []
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).toBeNull();
    });

    it('should skip split_group widgets', () => {
      const widget = createWidget({
        type: 'split_group',
        widgets: []
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should return null if no requests', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test'
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).toBeNull();
    });

    it('should return null if no queries in request', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [{}]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).toBeNull();
    });

    it('should return null if query is empty string', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: '' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).toBeNull();
    });

    it('should use default title for widgets without title', () => {
      const widget = createWidget({
        type: 'timeseries',
        requests: [
          {
            queries: [{ query: 'count:metric{}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.display.name).toBe('Untitled Panel');
    });

    it('should set empty description', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'count:metric{}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.display.description).toBe('');
    });

    it('should set empty links array', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Test',
        requests: [
          {
            queries: [{ query: 'count:metric{}' }]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result.spec.links).toEqual([]);
    });
  });

  describe('Real World Examples', () => {
    it('should convert Apollo Router request duration panel', () => {
      const widget = createWidget({
        type: 'timeseries',
        title: 'Request Duration by Subgraph',
        requests: [
          {
            queries: [
              { query: 'p95:http.server.request.duration{service:apollo-router} by {subgraph.name}' },
              { query: 'p99:http.server.request.duration{service:apollo-router} by {subgraph.name}' }
            ]
          }
        ]
      });

      const result = convertWidget(widget, 'panel-1', metricTypeRules, attributeMappings);

      expect(result).not.toBeNull();
      expect(result.spec.display.name).toBe('Request Duration by Subgraph');
      expect(result.spec.queries.length).toBe(2);
      expect(result.spec.queries[0].spec.plugin.spec.query).toContain('histogram_quantile(0.95');
      expect(result.spec.queries[1].spec.plugin.spec.query).toContain('histogram_quantile(0.99');
    });
  });
});

describe('extractWidgets', () => {
  it('should extract flat list of widgets', () => {
    const widgets = [
      {
        definition: { type: 'timeseries' }
      },
      {
        definition: { type: 'query_value' }
      }
    ];

    const result = extractWidgets(widgets);

    expect(result).toHaveLength(2);
    expect(result).toEqual(widgets);
  });

  it('should extract widgets from groups recursively', () => {
    const widgets = [
      {
        definition: {
          type: 'group',
          widgets: [
            { definition: { type: 'timeseries' } },
            { definition: { type: 'query_value' } }
          ]
        }
      },
      {
        definition: { type: 'note' }
      }
    ];

    const result = extractWidgets(widgets);

    expect(result).toHaveLength(3);
    expect(result[0].definition.type).toBe('timeseries');
    expect(result[1].definition.type).toBe('query_value');
    expect(result[2].definition.type).toBe('note');
  });

  it('should handle deeply nested groups', () => {
    const widgets = [
      {
        definition: {
          type: 'group',
          widgets: [
            {
              definition: {
                type: 'group',
                widgets: [
                  { definition: { type: 'timeseries' } }
                ]
              }
            }
          ]
        }
      }
    ];

    const result = extractWidgets(widgets);

    expect(result).toHaveLength(1);
    expect(result[0].definition.type).toBe('timeseries');
  });

  it('should handle split_group widgets', () => {
    const widgets = [
      {
        definition: {
          type: 'split_group',
          widgets: [
            { definition: { type: 'timeseries' } }
          ]
        }
      }
    ];

    const result = extractWidgets(widgets);

    expect(result).toHaveLength(1);
    expect(result[0].definition.type).toBe('timeseries');
  });

  it('should handle empty widget arrays', () => {
    const result = extractWidgets([]);
    expect(result).toEqual([]);
  });

  it('should handle groups with no widgets', () => {
    const widgets = [
      {
        definition: {
          type: 'group',
          widgets: []
        }
      }
    ];

    const result = extractWidgets(widgets);

    expect(result).toEqual([]);
  });

  it('should preserve widget order in mixed structures', () => {
    const widgets = [
      { definition: { type: 'note', id: '1' } },
      {
        definition: {
          type: 'group',
          widgets: [
            { definition: { type: 'timeseries', id: '2' } },
            { definition: { type: 'query_value', id: '3' } }
          ]
        }
      },
      { definition: { type: 'note', id: '4' } }
    ];

    const result = extractWidgets(widgets);

    expect(result).toHaveLength(4);
    expect(result[0].definition.id).toBe('1');
    expect(result[1].definition.id).toBe('2');
    expect(result[2].definition.id).toBe('3');
    expect(result[3].definition.id).toBe('4');
  });

  it('should allow custom results accumulator', () => {
    const widgets = [
      { definition: { type: 'timeseries' } }
    ];
    const customResults = [{ custom: 'widget' }];

    const result = extractWidgets(widgets, customResults);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ custom: 'widget' });
    expect(result[1].definition.type).toBe('timeseries');
  });
});
