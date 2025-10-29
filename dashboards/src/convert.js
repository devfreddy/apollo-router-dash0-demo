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

// ============================================================================
// CONFIGURATION LOADING
// ============================================================================
// These configurations are extracted to separate JSON files for maintainability.
// See docs/CONVERSION_MAPPINGS.md for detailed explanations of all rules.

// Load metric type detection rules
const metricTypeRules = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'metric-types.json'), 'utf8')
).rules;

// Load aggregation patterns documentation
const aggregationPatterns = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'aggregation-patterns.json'), 'utf8')
);

// Load attribute name mappings
const attributeMappings = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'config', 'attribute-mappings.json'), 'utf8')
).mappings;

// Load the Datadog dashboard
const datadogDashboard = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'datadog', 'graphos-template.json'), 'utf8')
);

/**
 * Map Datadog label names to Dash0 attribute names
 *
 * Rules:
 * 1. If attribute is in mappings table, use mapped name
 * 2. Otherwise, replace dots with underscores (e.g., 'http.status' -> 'http_status')
 *
 * See config/attribute-mappings.json for complete mapping table and rationale.
 * See docs/CONVERSION_MAPPINGS.md Table 3 for quick reference.
 */
function mapAttributeName(ddAttributeName) {
  // Check if this attribute has an explicit mapping
  if (attributeMappings[ddAttributeName]) {
    return attributeMappings[ddAttributeName].dash0_name;
  }

  // Default: replace dots with underscores for PromQL compatibility
  return ddAttributeName.replace(/\./g, '_');
}

/**
 * Convert Datadog metric query to PromQL for Dash0
 *
 * This is the core conversion logic that:
 * 1. Parses Datadog query syntax (aggregation:metric{filters} by {groups})
 * 2. Determines metric type (histogram, gauge, or sum)
 * 3. Maps aggregation to appropriate PromQL functions based on metric type
 * 4. Builds PromQL expression with correct selectors and aggregations
 *
 * Key insight: The PromQL function choice depends on BOTH:
 * - The metric TYPE (histogram needs histogram_*, gauges need direct aggregation, etc.)
 * - The aggregation FUNCTION (count, avg, sum, percentile, etc.)
 * - The presence of GROUP BY clause
 * - Special cases for specific metrics (e.g., http.server.request.duration)
 *
 * Handles these Datadog patterns:
 * - Percentiles: p50:metric{...} → histogram_quantile()
 * - Count: count:metric{...}.as_count() → histogram_sum(increase(...))
 * - Rate: count:metric{...}.as_rate() → sum(rate(...))
 * - Average: avg:metric{...} → histogram_avg() or avg()
 * - Sum: sum:metric{...} → histogram_sum() or sum()
 *
 * See docs/CONVERSION_MAPPINGS.md Table 2 for aggregation patterns.
 * See docs/PROMQL_REFERENCE.md for PromQL function explanations.
 */
function convertToPromQL(datadogQuery, widgetType) {
  if (!datadogQuery) return null;

  // STEP 1: Parse Datadog query syntax
  // Format: AGGREGATION:metric_name{filters} by {labels}[.modifiers()]
  // Example: p95:http.server.request.duration{$service} by {subgraph.name}.as_count()
  const metricMatch = datadogQuery.match(/^(count|avg|sum|max|min|p\d+):([^{]+)/);
  if (!metricMatch) return null;

  const [, aggregation, metricName] = metricMatch;
  const cleanMetricName = metricName.trim();

  // STEP 2: Determine metric type
  // This is critical - the type determines which PromQL functions to use:
  // - histogram → histogram_quantile(), histogram_avg(), histogram_sum(), rate()
  // - gauge → avg(), sum(), max(), min() (no rate())
  // - sum → rate(), increase() (monotonic counter)
  const metricType = getMetricType(cleanMetricName);

  // STEP 3: Extract grouping (if present)
  // Datadog: by {label1, label2, label3}
  // PromQL: by (label1, label2, label3)
  // Also map label names from Datadog to Dash0 format
  const byMatch = datadogQuery.match(/by \{([^}]+)\}/);
  const groupBy = byMatch ? byMatch[1].split(',').map(attr => mapAttributeName(attr.trim())).join(', ') : '';

  // STEP 4: Build metric selector for Dash0
  // Dash0 requires identifying metrics by name and type
  // This helps distinguish between similar metrics that might be different types
  // Format: {otel_metric_name="...", otel_metric_type="..."}
  const baseSelector = `{otel_metric_name = "${cleanMetricName}", otel_metric_type = "${metricType}"}`;

  // STEP 5: Build PromQL expression
  // This is where the metric type and aggregation function determine the PromQL syntax
  // See config/aggregation-patterns.json and docs/CONVERSION_MAPPINGS.md Table 2
  //
  // CRITICAL RULES:
  // 1. histogram_quantile() REQUIRES 'le' label in grouping - this is a PromQL requirement
  // 2. NO rate() on gauges - gauges are instantaneous values
  // 3. Use rate() for per-second values on histograms and counters
  // 4. Use increase() for total change over time window
  // 5. histogram_sum(), histogram_avg() extract from histogram buckets
  let promql = '';

  if (aggregation.startsWith('p')) {
    // PERCENTILE queries - only for histogram metrics
    // Datadog: p95:metric{...} by {label}
    // PromQL: histogram_quantile(0.95, rate({metric}[window]))
    const percentile = parseInt(aggregation.substring(1)) / 100;

    if (groupBy) {
      promql = `histogram_quantile(${percentile}, sum by (${groupBy}, le) (rate(${baseSelector}[2m])))`;
    } else {
      promql = `histogram_quantile(${percentile}, rate(${baseSelector}[2m]))`;
    }
  } else if (aggregation === 'count') {
    // COUNT aggregation - behavior depends on metric type and modifiers
    // .as_rate() → per-second rate (e.g., requests/sec)
    // .as_count() → total count (e.g., total requests)
    // (no modifier) → depends on context (see special cases)

    if (datadogQuery.includes('.as_rate()')) {
      // RATE mode: requests per second
      // Use rate() to convert counter to per-second value
      if (groupBy) {
        promql = `sum by (${groupBy}) (rate(${baseSelector}[2m]))`;
      } else {
        promql = `sum(rate(${baseSelector}[2m]))`;
      }
    } else if (datadogQuery.includes('.as_count()')) {
      // COUNT mode: total requests in time window
      // Use increase() to get total change over window, then extract from histogram
      if (groupBy) {
        promql = `histogram_sum(sum by (${groupBy}) (increase(${baseSelector}[2m])))`;
      } else {
        // SPECIAL CASE: http.server.request.duration
        // This metric has high cardinality from per-operation breakdown
        // Wrapping with sum() avoids creating noisy series per-operation
        if (cleanMetricName === 'http.server.request.duration') {
          promql = `histogram_sum(sum(increase(${baseSelector}[2m])))`;
        } else {
          promql = `histogram_sum(increase(${baseSelector}[2m]))`;
        }
      }
    } else {
      // DEFAULT count (no explicit modifier)
      // For http.server.request.duration: use .as_count() pattern to reduce cardinality
      // For others: use rate pattern for time-series graphs
      if (cleanMetricName === 'http.server.request.duration') {
        // High-cardinality metric: aggregate to clean up series
        if (groupBy) {
          promql = `histogram_sum(sum by (${groupBy}) (increase(${baseSelector}[2m])))`;
        } else {
          promql = `histogram_sum(sum(increase(${baseSelector}[2m])))`;
        }
      } else {
        // Normal metric: show per-second throughput
        if (groupBy) {
          promql = `sum by (${groupBy}) (rate(${baseSelector}[2m]))`;
        } else {
          promql = `sum(rate(${baseSelector}[2m]))`;
        }
      }
    }
  } else if (aggregation === 'sum') {
    // Sum aggregation
    if (metricType === 'histogram') {
      if (groupBy) {
        promql = `histogram_sum(sum by (${groupBy}) (rate(${baseSelector}[2m])))`;
      } else {
        // Special handling: for client request duration baseline, group by subgraph to show per-subgraph latency
        if (cleanMetricName === 'http.client.request.duration') {
          promql = `histogram_sum(sum by (subgraph_name) (rate(${baseSelector}[2m])))`;
        } else {
          promql = `histogram_sum(rate(${baseSelector}[2m]))`;
        }
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
        // Special handling: for client request duration baseline, group by subgraph to show per-subgraph latency
        if (cleanMetricName === 'http.client.request.duration') {
          promql = `histogram_avg(sum by (subgraph_name) (rate(${baseSelector}[2m])))`;
        } else {
          // For other histograms, just aggregate to single value
          promql = `histogram_avg(rate(${baseSelector}[2m]))`;
        }
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
 * Determine OpenTelemetry metric type based on metric name
 *
 * ⚠️ CRITICAL: This function must correctly identify metric types or dashboard queries will fail.
 * The three types require different PromQL handling:
 *
 * - HISTOGRAM: Duration, latency, size metrics showing distributions
 *   → Use: histogram_quantile(), histogram_avg(), histogram_sum() with rate()
 *   → Example: http.server.request.duration, request.body.size
 *
 * - GAUGE: Current instantaneous values that can go up or down
 *   → Use: avg(), sum(), max(), min() WITHOUT rate()
 *   → Example: cache.size, queue_depth, active_connections
 *
 * - SUM/COUNTER: Monotonic counters that only increase
 *   → Use: rate() for per-second, increase() for total with aggregation
 *   → Example: operations, errors, requests
 *
 * Rules are evaluated in order - first match wins.
 * Special cases (exceptions) are checked before general rules to prevent false positives.
 *
 * For detailed rules and rationale, see:
 * - config/metric-types.json (extraction of these rules)
 * - docs/CONVERSION_MAPPINGS.md Table 1 (visual reference)
 * - docs/CONVERSION_STRATEGY.md (architecture and reasoning)
 */
function getMetricType(metricName) {
  // Evaluate rules in order - first match wins
  for (const rule of metricTypeRules) {
    // Handle default rule (pattern: '*')
    if (rule.pattern === '*') {
      return rule.type;
    }

    // Handle exact match rules (start with ^)
    if (rule.pattern.startsWith('^')) {
      const regex = new RegExp(rule.pattern + '$');
      if (regex.test(metricName)) {
        return rule.type;
      }
    } else {
      // Handle includes() rules - check if any pattern matches
      const patterns = rule.pattern.split('|');
      for (const pattern of patterns) {
        if (metricName.includes(pattern)) {
          return rule.type;
        }
      }
    }
  }

  // Fallback (should not reach here due to default rule)
  return 'gauge';
}

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

  // Generate a friendly name for the query
  const queryName = generateQueryName(firstQuery.query, promql);

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
const outputPath = path.join(__dirname, '..', 'dash0', 'apollo-router-performance.json');
fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));

console.log(`✅ Dashboard converted successfully!`);
console.log(`📊 Panels created: ${Object.keys(dashboard.spec.panels).length}`);
console.log(`📁 Output: ${outputPath}`);

// Generate organized dashboards by running organize-dashboards.js
console.log(`\n📋 Organizing dashboards by section...`);
const { execSync } = require('child_process');
try {
  execSync(`node ${path.join(__dirname, '..', 'organize-dashboards.js')}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('Error organizing dashboards:', error.message);
}

// Create combined grouped dashboard
console.log(`\n📊 Creating combined grouped dashboard...`);
try {
  execSync(`node ${path.join(__dirname, '..', 'create-grouped-dashboard.js')}`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('Error creating grouped dashboard:', error.message);
}

console.log(`\n✨ All done!`);
console.log(`\nGenerated dashboards:`);
console.log(`  📊 COMBINED GROUPED DASHBOARD:`);
console.log(`     • apollo-router-complete-grouped.json - All 41 panels in 5 collapsible groups`);
console.log(`\n  📁 INDIVIDUAL ORGANIZED DASHBOARDS:`);
console.log(`     • client-traffic-dashboard.json - Client → Router metrics (5 panels)`);
console.log(`     • router-backend-dashboard.json - Router → Backend metrics (6 panels)`);
console.log(`     • router-internals-dashboard.json - Internals: Query Planning, Cache, Compute Jobs (11 panels)`);
console.log(`     • infrastructure-dashboard.json - Container/Host/K8s metrics (8 panels)`);
console.log(`     • coprocessors-dashboard.json - Coprocessors & Sentinel metrics (11 panels)`);
console.log(`\n  📄 REFERENCE DASHBOARDS:`);
console.log(`     • apollo-router-performance.json - Main flat dashboard (41 panels)`);
console.log(`\nNext steps:`);
console.log(`1. Deploy to Dash0: ./dashboards/deploy.sh`);
console.log(`2. Or import specific dashboard: dashboard/dash0/apollo-router-complete-grouped.json`);
