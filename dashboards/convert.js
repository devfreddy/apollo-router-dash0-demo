#!/usr/bin/env node

/**
 * Converts Apollo Router Datadog dashboard to Dash0 Perses format
 *
 * Usage: node convert.js
 *
 * Key learnings for accurate dashboard conversion:
 * 1. Metric types must be correct (histogram vs gauge vs sum) - check actual OTel metrics
 * 2. Delta temporality must be configured in router.yaml for proper rate() calculations
 * 3. Attribute names in Dash0 differ from Datadog (e.g., 'kind' not 'apollo_router_cache_kind')
 * 4. Use histogram_quantile() for percentiles, not max() on raw histogram data
 * 5. Gauges don't need rate() - query them directly
 * 6. Histograms need rate() for time-series queries
 */

const fs = require('fs');
const path = require('path');

// Load the Datadog dashboard
const datadogDashboard = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'datadog', 'graphos-template.json'), 'utf8')
);

/**
 * Map Datadog label names to Dash0 attribute names
 * Dash0 uses dots in attribute keys, but underscores in PromQL label selectors
 */
function mapAttributeName(ddAttributeName) {
  const mapping = {
    'http.response.status_code': 'http_status_code',
    'http.request.method': 'http_method',
    'http.route': 'http_route',
    'http.method': 'http_method',
    'subgraph.name': 'subgraph_name',
    'graphql.operation.type': 'graphql_operation_type',
    'graphql.operation.name': 'graphql_operation_name',
    // Cache attributes - use actual Dash0 attribute names
    'cache.type': 'storage',
    'kind': 'kind',
    // Resource attributes for better grouping in Dash0
    'host': 'dash0_resource_name',
    'pod_name': 'dash0_resource_name',
    'container_id': 'dash0_resource_id',
    // Version attributes
    'apollo_router_cache_kind': 'kind',
    'version': 'service_version',
  };

  return mapping[ddAttributeName] || ddAttributeName.replace(/\./g, '_');
}

/**
 * Convert Datadog metric query to PromQL for Dash0
 * This handles the specific patterns used in the Apollo Router Datadog template
 */
function convertToPromQL(datadogQuery, widgetType) {
  if (!datadogQuery) return null;

  // Extract metric name and aggregation
  const metricMatch = datadogQuery.match(/^(count|avg|sum|max|min|p\d+):([^{]+)/);
  if (!metricMatch) return null;

  const [, aggregation, metricName] = metricMatch;
  const cleanMetricName = metricName.trim();

  // Determine metric type based on metric name
  const metricType = getMetricType(cleanMetricName);

  // Extract group by clause
  const byMatch = datadogQuery.match(/by \{([^}]+)\}/);
  const groupBy = byMatch ? byMatch[1].split(',').map(attr => mapAttributeName(attr.trim())).join(', ') : '';

  // Build the base selector for Dash0
  const baseSelector = `{otel_metric_name = "${cleanMetricName}", otel_metric_type = "${metricType}"}`;

  // Build PromQL query based on aggregation and query type
  let promql = '';

  if (aggregation.startsWith('p')) {
    // Percentile query for histograms
    const percentile = parseInt(aggregation.substring(1)) / 100;

    if (groupBy) {
      promql = `histogram_quantile(${percentile}, sum by (${groupBy}, le) (rate(${baseSelector}[2m])))`;
    } else {
      promql = `histogram_quantile(${percentile}, rate(${baseSelector}[2m]))`;
    }
  } else if (aggregation === 'count') {
    // Count aggregation for histograms
    if (datadogQuery.includes('.as_rate()')) {
      // Rate of requests
      if (groupBy) {
        promql = `sum by (${groupBy}) (rate(${baseSelector}[2m]))`;
      } else {
        promql = `sum(rate(${baseSelector}[2m]))`;
      }
    } else if (datadogQuery.includes('.as_count()')) {
      // Total count
      if (groupBy) {
        promql = `histogram_sum(sum by (${groupBy}) (increase(${baseSelector}[2m])))`;
      } else {
        promql = `histogram_sum(increase(${baseSelector}[2m]))`;
      }
    } else {
      // Default count
      if (groupBy) {
        promql = `sum by (${groupBy}) (rate(${baseSelector}[2m]))`;
      } else {
        promql = `sum(rate(${baseSelector}[2m]))`;
      }
    }
  } else if (aggregation === 'sum') {
    // Sum aggregation
    if (metricType === 'histogram') {
      if (groupBy) {
        promql = `histogram_sum(sum by (${groupBy}) (rate(${baseSelector}[2m])))`;
      } else {
        promql = `histogram_sum(rate(${baseSelector}[2m]))`;
      }
    } else if (metricType === 'sum') {
      if (groupBy) {
        promql = `sum by (${groupBy}) (rate(${baseSelector}[2m]))`;
      } else {
        promql = `sum(rate(${baseSelector}[2m]))`;
      }
    } else {
      // Gauge
      if (groupBy) {
        promql = `sum by (${groupBy}) (${baseSelector})`;
      } else {
        promql = `sum(${baseSelector})`;
      }
    }
  } else if (aggregation === 'avg') {
    // Average aggregation
    if (metricType === 'histogram') {
      if (groupBy) {
        promql = `histogram_avg(sum by (${groupBy}) (rate(${baseSelector}[2m])))`;
      } else {
        promql = `histogram_avg(rate(${baseSelector}[2m]))`;
      }
    } else {
      if (groupBy) {
        promql = `avg by (${groupBy}) (${baseSelector})`;
      } else {
        promql = `avg(${baseSelector})`;
      }
    }
  } else {
    // Other aggregations (max, min)
    if (groupBy) {
      promql = `${aggregation} by (${groupBy}) (${baseSelector})`;
    } else {
      promql = `${aggregation}(${baseSelector})`;
    }
  }

  return promql;
}

/**
 * Determine OTEL metric type based on metric name
 *
 * IMPORTANT: This function determines the actual OTel metric type for the router.
 * Getting this wrong will cause dashboard queries to fail.
 *
 * Apollo Router metric type reference:
 * - Histograms: duration, time, body.size, request.body.size, response.body.size, evaluated_plans, evaluated_paths
 * - Gauges: cache.size, queued, active, jemalloc.*, pipelines, session.count, open_connections, license, federation
 * - Sums (Counters): operations, count.total, state.change.total, active_requests, active_jobs, graphql_error, telemetry.*
 */
function getMetricType(metricName) {
  // Duration and time metrics are ALWAYS histograms
  if (metricName.includes('duration') || metricName.includes('.time')) {
    return 'histogram';
  }

  // Size and body metrics are ALWAYS histograms
  if (metricName.includes('body.size') || metricName.includes('request.body') || metricName.includes('response.body')) {
    return 'histogram';
  }

  // Query planning metrics (evaluated_plans, evaluated_paths) are histograms
  if (metricName.includes('evaluated_plans') || metricName.includes('evaluated_paths')) {
    return 'histogram';
  }

  // EXCEPTION: cache.size is a GAUGE, not histogram (common mistake!)
  if (metricName === 'apollo.router.cache.size') {
    return 'gauge';
  }

  // Operation and count metrics are typically sums (counters)
  if (metricName.includes('operations') || metricName.includes('.count.total') || metricName.includes('.total') ||
      metricName.includes('active_requests') || metricName.includes('active_jobs') ||
      metricName.includes('graphql_error') || metricName.includes('telemetry') ||
      metricName.includes('state.change')) {
    return 'sum';
  }

  // Queue, session, connection, and resource metrics are gauges
  if (metricName.includes('queued') || metricName.includes('session') ||
      metricName.includes('open_connections') || metricName.includes('pipelines') ||
      metricName.includes('license') || metricName.includes('federation')) {
    return 'gauge';
  }

  // Jemalloc memory allocator metrics are gauges
  if (metricName.includes('jemalloc')) {
    return 'gauge';
  }

  // Default to gauge
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
                query: promql,
                seriesNameFormat: firstRequest?.style?.palette === 'semantic' ? '{{__name__}}' : undefined
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
