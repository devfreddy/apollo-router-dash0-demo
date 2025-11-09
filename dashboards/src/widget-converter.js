/**
 * Widget Converter Module
 *
 * Convert Datadog widgets to Perses panels
 */

const { convertToPromQL } = require('./promql-converter');

/**
 * Generate a friendly name for a query based on its characteristics
 */
function generateQueryName(datadogQuery, promql) {
  // Extract key information from the Datadog query
  const metricMatch = datadogQuery.match(/^(count|avg|sum|max|min|p\d+):([^{]+)/);
  if (!metricMatch) return 'Query';

  const [, aggregation, metricName] = metricMatch;
  const byMatch = datadogQuery.match(/by \{([^}]+)\}/);
  const groupBy = byMatch ? byMatch[1].split(',').map(attr => attr.trim()) : [];

  // Build a human-readable name based on aggregation and grouping
  let aggregationName = aggregation;
  if (aggregation.startsWith('p')) {
    aggregationName = `p${aggregation.substring(1)}`;
  } else if (aggregation === 'count') {
    aggregationName = 'Total';
  }

  // If grouped by single attribute, show it
  if (groupBy.length === 1) {
    const attr = groupBy[0].replace(/\./g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
    return `By ${attr.charAt(0).toUpperCase() + attr.slice(1)}`;
  }

  // If multiple groupings or no grouping, just show aggregation
  if (groupBy.length > 1) {
    return `By ${groupBy.map(g => g.split('.').pop()).join(', ')}`;
  }

  return aggregationName.charAt(0).toUpperCase() + aggregationName.slice(1);
}

/**
 * Convert Datadog note widget to Markdown panel
 */
function convertMarkdownWidget(widget) {
  const def = widget.definition;

  if (def.type !== 'note' || !def.content) {
    return null;
  }

  // Extract first line as title (up to 60 chars)
  const firstLine = def.content.split('\n')[0];
  const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;

  const panel = {
    kind: 'Panel',
    spec: {
      display: {
        name: title || 'Documentation',
        description: ''
      },
      links: [],
      options: {
        hideHeader: true
      },
      plugin: {
        kind: 'Markdown',
        spec: {
          text: def.content
        }
      }
    }
  };

  // Mark this as a markdown panel so we can apply a minimum height in the layout
  // Store the layout info if available, or signal that we should use a default minimum height
  if (widget.layout) {
    panel._datadogLayout = widget.layout;
  }
  panel._isMarkdownPanel = true;

  return panel;
}

/**
 * Convert Datadog widget to Perses panel
 */
function convertWidget(widget, panelId, metricTypeRules, attributeMappings) {
  const def = widget.definition;

  // Convert markdown/note widgets
  if (def.type === 'note') {
    return convertMarkdownWidget(widget);
  }

  // Skip group widgets
  if (def.type === 'group' || def.type === 'split_group') {
    return null;
  }

  // Get the first request (which may contain multiple queries)
  const firstRequest = def.requests?.[0];
  const queries = firstRequest?.queries || [];

  if (!queries.length || !queries[0].query) {
    return null;
  }

  // Convert all queries to PromQL
  const promqlQueries = [];
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const promql = convertToPromQL(query.query, def.type, metricTypeRules, attributeMappings);

    if (!promql) {
      console.warn(`Could not convert query: ${query.query}`);
      continue;
    }

    // Generate a friendly name for the query
    const queryName = generateQueryName(query.query, promql);

    promqlQueries.push({
      kind: 'TimeSeriesQuery',
      spec: {
        display: {
          name: queryName
        },
        plugin: {
          kind: 'PrometheusTimeSeriesQuery',
          spec: {
            query: promql,
            seriesNameFormat: firstRequest?.style?.palette === 'semantic' ? '{{__name__}}' : undefined
          }
        }
      }
    });
  }

  if (!promqlQueries.length) {
    return null;
  }

  // Determine panel plugin type and configuration
  let pluginKind = 'TimeSeriesChart';
  let pluginSpec = {};

  if (def.type === 'query_value') {
    pluginKind = 'StatChart';
    // StatChart requires a calculation method
    // Default to 'mean' for general aggregation - can be overridden per widget
    pluginSpec = {
      calculation: 'mean'
    };
  }

  return {
    kind: 'Panel',
    spec: {
      display: {
        name: def.title || 'Untitled Panel',
        description: ''
      },
      links: [],
      plugin: {
        kind: pluginKind,
        spec: pluginSpec
      },
      queries: promqlQueries
    }
  };
}

/**
 * Extract all widgets recursively from groups
 */
function extractWidgets(widgets, results = []) {
  for (const widget of widgets) {
    if (widget.definition.type === 'group' || widget.definition.type === 'split_group') {
      if (widget.definition.widgets) {
        extractWidgets(widget.definition.widgets, results);
      }
    } else {
      results.push(widget);
    }
  }
  return results;
}

module.exports = {
  generateQueryName,
  convertWidget,
  convertMarkdownWidget,
  extractWidgets
};
