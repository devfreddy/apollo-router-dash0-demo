/**
 * Metric Type Detection Module
 *
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

function getMetricType(metricName, metricTypeRules) {
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

module.exports = {
  getMetricType
};
