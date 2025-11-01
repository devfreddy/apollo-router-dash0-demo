/**
 * PromQL Converter Module
 *
 * Convert Datadog metric queries to PromQL for Dash0
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

const { getMetricType } = require('./metric-type');
const { extractGroupBy } = require('./attribute-mapper');

/**
 * Convert Datadog metric query to PromQL for Dash0
 */
function convertToPromQL(datadogQuery, widgetType, metricTypeRules, attributeMappings) {
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
  const metricType = getMetricType(cleanMetricName, metricTypeRules);

  // STEP 3: Extract grouping (if present)
  // Datadog: by {label1, label2, label3}
  // PromQL: by (label1, label2, label3)
  // Also map label names from Datadog to Dash0 format
  const groupBy = extractGroupBy(datadogQuery, attributeMappings);

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
    // PromQL: histogram_quantile(0.95, sum by (..., le) (rate({metric}[window])))
    //
    // CRITICAL: histogram_quantile requires the 'le' label to be present
    // - With GROUP BY: sum by (label, le) to preserve buckets per label
    // - Without GROUP BY: sum(rate()) to aggregate ALL dimensions including buckets,
    //   then histogram_quantile will calculate the percentile from the aggregated data
    const percentile = parseInt(aggregation.substring(1)) / 100;

    if (groupBy) {
      promql = `histogram_quantile(${percentile}, sum by (${groupBy}, le) (rate(${baseSelector}[2m])))`;
    } else {
      // No group by: aggregate completely to get a single percentile value
      // sum(rate()) aggregates across all dimensions, then histogram_quantile
      // interprets the aggregated buckets to calculate the percentile
      promql = `histogram_quantile(${percentile}, sum(rate(${baseSelector}[2m])))`;
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
        // No group by: aggregate to single value
        promql = `histogram_avg(rate(${baseSelector}[2m]))`;
      }
    } else {
      if (groupBy) {
        promql = `avg by (${groupBy}) (${baseSelector})`;
      } else {
        promql = `avg(${baseSelector})`;
      }
    }
  } else if (aggregation === 'max' || aggregation === 'min') {
    // Max/Min aggregations - behavior depends on metric type
    // NOTE: Dash0 limitation - max() and min() don't work with histograms that have delta temporality
    // Use histogram_avg() as a fallback for max/min on histograms (closest semantic meaning)
    if (metricType === 'histogram') {
      // WORKAROUND: Dash0 doesn't support max/min on delta-temporality histograms
      // Use histogram_avg() instead as it's the closest meaningful aggregate
      // CRITICAL: Must use sum() to aggregate across all labels, matching percentile behavior
      if (groupBy) {
        promql = `histogram_avg(sum by (${groupBy}) (rate(${baseSelector}[2m])))`;
      } else {
        // No group by: aggregate completely to get a single value
        promql = `histogram_avg(sum(rate(${baseSelector}[2m])))`;
      }
    } else if (metricType === 'sum') {
      if (groupBy) {
        promql = `${aggregation} by (${groupBy}) (rate(${baseSelector}[2m]))`;
      } else {
        promql = `${aggregation}(rate(${baseSelector}[2m]))`;
      }
    } else {
      // Gauge - no rate() needed
      if (groupBy) {
        promql = `${aggregation} by (${groupBy}) (${baseSelector})`;
      } else {
        promql = `${aggregation}(${baseSelector})`;
      }
    }
  } else {
    // Unknown aggregations - apply sensible defaults
    if (metricType === 'histogram' || metricType === 'sum') {
      if (groupBy) {
        promql = `${aggregation} by (${groupBy}) (rate(${baseSelector}[2m]))`;
      } else {
        promql = `${aggregation}(rate(${baseSelector}[2m]))`;
      }
    } else {
      if (groupBy) {
        promql = `${aggregation} by (${groupBy}) (${baseSelector})`;
      } else {
        promql = `${aggregation}(${baseSelector})`;
      }
    }
  }

  return promql;
}

module.exports = {
  convertToPromQL
};
