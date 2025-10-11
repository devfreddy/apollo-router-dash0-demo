#!/usr/bin/env node

/**
 * Converts Apollo Router Datadog dashboard to Dash0 Perses format
 *
 * Usage: node convert.js
 */

const fs = require('fs');
const path = require('path');

// Load the Datadog dashboard
const datadogDashboard = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'datadog', 'graphos-template.json'), 'utf8')
);

/**
 * Convert Datadog metric query to PromQL
 * This is a simplified conversion - may need adjustments for complex queries
 */
function convertToPromQL(datadogQuery, widgetType) {
  if (!datadogQuery) return null;

  // Extract metric name and tags
  const metricMatch = datadogQuery.match(/^(count|avg|sum|max|min|p\d+):([^{]+)/);
  if (!metricMatch) return null;

  const [, aggregation, metricName] = metricMatch;

  // Convert dots to underscores for PromQL
  const promMetricName = metricName.trim().replace(/\./g, '_');

  // Extract tags/filters
  const tagsMatch = datadogQuery.match(/\{([^}]+)\}/);
  let filters = '';
  let groupBy = '';

  if (tagsMatch) {
    const tags = tagsMatch[1];

    // Extract group by clause
    const byMatch = datadogQuery.match(/by \{([^}]+)\}/);
    if (byMatch) {
      groupBy = byMatch[1];
    }

    // Convert filters - remove template variables and negative filters for now
    const filterParts = tags.split(',')
      .filter(tag => !tag.includes('$') && !tag.includes('!'))
      .filter(tag => tag.includes(':'))
      .map(tag => {
        const [key, value] = tag.split(':');
        if (value === 'true') {
          return `${key.trim()}="true"`;
        }
        if (value.endsWith('*')) {
          return `${key.trim()}=~"${value.replace('*', '.*')}"`;
        }
        return `${key.trim()}="${value.trim()}"`;
      });

    if (filterParts.length > 0) {
      filters = filterParts.join(', ');
    }
  }

  // Determine metric type based on metric name
  const metricType = getMetricType(promMetricName);

  // Build PromQL query based on aggregation
  let promql = '';

  if (aggregation.startsWith('p')) {
    // Percentile query for histograms
    const percentile = parseInt(aggregation.substring(1)) / 100;
    const baseSelector = filters
      ? `{otel_metric_name="${promMetricName}", otel_metric_type="${metricType}", ${filters}}`
      : `{otel_metric_name="${promMetricName}", otel_metric_type="${metricType}"}`;

    if (groupBy) {
      promql = `histogram_quantile(${percentile}, sum by (${groupBy}, le) (rate(${baseSelector}[1m])))`;
    } else {
      promql = `histogram_quantile(${percentile}, rate(${baseSelector}[1m]))`;
    }
  } else if (aggregation === 'count') {
    // Count aggregation
    const baseSelector = filters
      ? `{otel_metric_name="${promMetricName}", otel_metric_type="${metricType}", ${filters}}`
      : `{otel_metric_name="${promMetricName}", otel_metric_type="${metricType}"}`;

    if (datadogQuery.includes('.as_rate()')) {
      promql = groupBy
        ? `sum by (${groupBy}) (rate(${baseSelector}[1m]))`
        : `rate(${baseSelector}[1m])`;
    } else {
      promql = groupBy
        ? `sum by (${groupBy}) (${baseSelector})`
        : `sum(${baseSelector})`;
    }
  } else {
    // Other aggregations (avg, sum, max, min)
    const baseSelector = filters
      ? `{otel_metric_name="${promMetricName}", otel_metric_type="${metricType}", ${filters}}`
      : `{otel_metric_name="${promMetricName}", otel_metric_type="${metricType}"}`;

    promql = groupBy
      ? `${aggregation} by (${groupBy}) (${baseSelector})`
      : `${aggregation}(${baseSelector})`;
  }

  return promql;
}

/**
 * Determine OTEL metric type based on metric name
 */
function getMetricType(metricName) {
  if (metricName.includes('duration') || metricName.includes('time') || metricName.includes('size')) {
    return 'histogram';
  }
  if (metricName.includes('count') || metricName.includes('operations')) {
    return 'sum';
  }
  return 'gauge';
}

/**
 * Convert Datadog widget to Perses panel
 */
function convertWidget(widget, panelId) {
  const def = widget.definition;

  // Skip group widgets and notes
  if (def.type === 'group' || def.type === 'note' || def.type === 'split_group') {
    return null;
  }

  // Get the first query
  const firstRequest = def.requests?.[0];
  const firstQuery = firstRequest?.queries?.[0];

  if (!firstQuery?.query) {
    return null;
  }

  const promql = convertToPromQL(firstQuery.query, def.type);

  if (!promql) {
    console.warn(`Could not convert query: ${firstQuery.query}`);
    return null;
  }

  // Determine panel plugin type
  let pluginKind = 'TimeSeriesChart';
  if (def.type === 'query_value') {
    pluginKind = 'StatChart';
  }

  return {
    kind: 'Panel',
    spec: {
      display: {
        name: def.title || 'Untitled Panel'
      },
      plugin: {
        kind: pluginKind,
        spec: {}
      },
      queries: [
        {
          kind: 'TimeSeriesQuery',
          spec: {
            plugin: {
              kind: 'PrometheusTimeSeriesQuery',
              spec: {
                query: promql
              }
            }
          }
        }
      ]
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

/**
 * Main conversion function
 */
function convertDashboard() {
  const allWidgets = extractWidgets(datadogDashboard.widgets);

  const panels = {};
  const layoutItems = [];

  let x = 0, y = 0;
  let panelIndex = 0;

  for (const widget of allWidgets) {
    const panelId = `panel_${panelIndex}`;
    const panel = convertWidget(widget, panelId);

    if (panel) {
      panels[panelId] = panel;

      // Create layout item (2 panels per row, 12 units each)
      layoutItems.push({
        x: x,
        y: y,
        width: 12,
        height: 8,
        content: {
          $ref: `#/spec/panels/${panelId}`
        }
      });

      // Move to next position
      x += 12;
      if (x >= 24) {
        x = 0;
        y += 8;
      }

      panelIndex++;
    }
  }

  // Create Dash0 dashboard in Perses format
  const dash0Dashboard = {
    kind: 'Dashboard',
    metadata: {
      name: 'apollo-router-performance',
      dash0Extensions: {
        dataset: 'default'
      }
    },
    spec: {
      display: {
        name: 'Apollo Router Performance',
        description: 'GraphOS Runtime Dashboard - Converted from Datadog template'
      },
      duration: '1h',
      refreshInterval: '30s',
      layouts: [
        {
          kind: 'Grid',
          spec: {
            items: layoutItems
          }
        }
      ],
      panels: panels
    }
  };

  return dash0Dashboard;
}

// Run conversion
const dashboard = convertDashboard();

// Write output
const outputPath = path.join(__dirname, 'dash0', 'apollo-router-performance.json');
fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));

console.log(`✅ Dashboard converted successfully!`);
console.log(`📊 Panels created: ${Object.keys(dashboard.spec.panels).length}`);
console.log(`📁 Output: ${outputPath}`);
console.log(`\nNext steps:`);
console.log(`1. Review the dashboard: cat ${outputPath}`);
console.log(`2. Deploy to Dash0: ./dashboards/deploy.sh`);
