# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Know What You're Converting

You have a **Datadog dashboard query** that needs to become a **Dash0 PromQL query**.

Example:
```
Datadog:  count:http.server.request.duration{$service} by {http.response.status_code}.as_count()
Goal:     Convert to PromQL that works in Dash0
```

### 2. Use the 5-Step Workflow

#### Step 1: Identify the Metric
```
count:http.server.request.duration
          ↓
Metric name: http.server.request.duration
```

#### Step 2: Determine Metric Type
- Look for keywords in metric name: `duration`, `latency`, `time`, `size`
  - If found → **histogram**
- Look for: `cache.size`, `active`, `queued`
  - If found → **gauge**
- Look for: `operations`, `.total`, `errors`
  - If found → **sum**

**For our example**: contains "duration" → **histogram**

#### Step 3: Get Aggregation Pattern
From [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) Table 2:

| Metric Type | Aggregation | Pattern |
|-------------|-------------|---------|
| histogram | count | `histogram_sum(increase(...[5m]))` |

**For our example**: histogram + count → `histogram_sum(increase(...[5m]))`

#### Step 4: Map Attribute Names
From [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) Table 3:

```
Datadog: {http.response.status_code}
Dash0:   {http_status_code}
```

Replace dots with underscores: `http.response.status_code` → `http_status_code`

#### Step 5: Build PromQL

Combine everything:

```promql
histogram_sum(
  sum by (http_status_code) (
    increase({
      otel_metric_name="http_server_request_duration",
      otel_metric_type="histogram"
    }[5m])
  )
)
```

### 3. Test in Dash0

Paste the PromQL in Dash0 query editor:
- ✅ Should show data
- ✅ Should show expected time-series
- ✅ Should match Datadog results

### 4. Done!

You've converted your first query! 🎉

---

## 📚 Reference Quick Lookup

### "How do I know if my metric is a histogram?"

See [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) **Table 1: Metric Type Detection Rules**

Pattern in metric name → Type
- `duration`, `latency`, `time` → histogram
- `cache.size`, `active`, `queued` → gauge
- `operations`, `.total`, `errors` → sum

### "What PromQL pattern do I use?"

See [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) **Table 2: Aggregation Translation Patterns**

Based on: Metric Type + Aggregation Function

Example: Histogram + count → `histogram_sum(increase(...))`

### "How do I map Datadog label names?"

See [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) **Table 3: Attribute Name Mapping**

Replace dots with underscores:
- `http.response.status_code` → `http_status_code`
- `graphql.operation.name` → `graphql_operation_name`

### "What panel type should I use?"

See [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) **Table 4: Panel Type Mapping**

- `timeseries` in Datadog → `TimeSeriesChart` in Dash0
- `query_value` in Datadog → `StatChart` in Dash0

### "Why isn't my query working?"

See [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md) **Common Pitfalls & Fixes**

Common issues:
- Missing `le` label in percentiles
- Using `rate()` on gauge metrics
- Metric name with dots instead of underscores

---

## 🎯 Common Query Patterns

### Pattern 1: Histogram Count with Grouping

```
Datadog: count:metric{$service} by {label}.as_count()
PromQL:  histogram_sum(sum by (label_name) (increase({metric}[5m])))
```

### Pattern 2: Histogram Percentile

```
Datadog: p95:metric{$service} by {label}
PromQL:  histogram_quantile(0.95, sum by (label_name, le) (rate({metric}[5m])))
```

### Pattern 3: Gauge Average (No Rate!)

```
Datadog: avg:metric{$service} by {label}
PromQL:  avg by (label_name) ({metric})
```

### Pattern 4: Counter Rate

```
Datadog: sum:metric{$service}.as_rate()
PromQL:  sum(rate({metric}[5m]))
```

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Using rate() on gauges

```
WRONG:  avg(rate(cache_size[5m]))  ← Gauges don't have rate!
RIGHT:  avg(cache_size)
```

### ❌ Mistake 2: Missing le in percentile

```
WRONG:  histogram_quantile(0.95, sum by (subgraph_name) (rate(...)))
RIGHT:  histogram_quantile(0.95, sum by (subgraph_name, le) (rate(...)))
```

### ❌ Mistake 3: Not converting metric names

```
WRONG:  {otel_metric_name="http.server.request.duration"}  ← Dots!
RIGHT:  {otel_metric_name="http_server_request_duration"}  ← Underscores
```

### ❌ Mistake 4: Not mapping label names

```
WRONG:  sum by (http.response.status_code)  ← Datadog name
RIGHT:  sum by (http_status_code)           ← Dash0 name
```

---

## 🔍 Validation Checklist

Before submitting your converted query:

- [ ] Metric type correctly identified (Table 1)
- [ ] Aggregation pattern matches type (Table 2)
- [ ] All label names mapped (Table 3)
- [ ] Percentile queries include `le` label
- [ ] No `rate()` on gauge metrics
- [ ] Metric names use underscores not dots
- [ ] Query returns data in Dash0
- [ ] Data matches expected values

---

## 📖 Going Deeper

### 5-15 Minutes
- Read [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md) for more examples
- Look up specific patterns in [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md)

### 30-60 Minutes
- Study [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md) for PromQL details
- Study [DATADOG_QUERY_REFERENCE.md](DATADOG_QUERY_REFERENCE.md) for Datadog syntax

### 2-3 Hours
- Read [CONVERSION_STRATEGY.md](CONVERSION_STRATEGY.md) for architecture
- Read [PERSES_DASHBOARD_FORMAT.md](PERSES_DASHBOARD_FORMAT.md) for JSON structure

---

## 🎓 Learning Paths

### For Quick Conversions (5 min each)
1. This page (QUICK_START.md)
2. Lookup tables in [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md)
3. Follow 5-step workflow above
4. Test in Dash0

### For Understanding Patterns (30 min)
1. This page (QUICK_START.md)
2. [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md) - see similar pattern
3. [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md) - understand PromQL function
4. Try similar conversion

### For Complete Knowledge (2-3 hours)
1. [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md) - end-to-end
2. [DATADOG_QUERY_REFERENCE.md](DATADOG_QUERY_REFERENCE.md) - understand source
3. [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md) - understand target
4. [PERSES_DASHBOARD_FORMAT.md](PERSES_DASHBOARD_FORMAT.md) - understand output
5. [CONVERSION_STRATEGY.md](CONVERSION_STRATEGY.md) - understand approach

---

## 💡 Pro Tips

1. **Use the tables first** - [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) has everything you need
2. **Follow the decision tree** - Table 8 walks you through logic step-by-step
3. **Check examples** - [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md) has before/after examples
4. **Validate early** - Test in Dash0 as you work, don't wait until the end
5. **Share learnings** - Found a new pattern? Document it in the tables

---

## 🚀 Ready to Convert?

Pick a Datadog query from the template and follow these steps:

1. Read this page (5 min)
2. Use [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) tables (2 min per table)
3. Follow the 5-step workflow (5 min)
4. Test in Dash0 (5 min)

**Total: ~20 minutes to convert your first query!**

---

## 📞 Need Help?

| Question | Resource |
|----------|----------|
| "Is metric X a histogram?" | [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) Table 1 |
| "What PromQL pattern for Y?" | [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) Table 2 |
| "What's the Dash0 name for Z?" | [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) Table 3 |
| "Why didn't my query work?" | [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md) Pitfalls section |
| "How does PromQL function X work?" | [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md) |
| "What's the Datadog syntax?" | [DATADOG_QUERY_REFERENCE.md](DATADOG_QUERY_REFERENCE.md) |
| "How do I structure Perses JSON?" | [PERSES_DASHBOARD_FORMAT.md](PERSES_DASHBOARD_FORMAT.md) |
| "What's the overall strategy?" | [CONVERSION_STRATEGY.md](CONVERSION_STRATEGY.md) |

---

## ✅ You're Ready!

You now have everything needed to convert Datadog dashboards to Dash0. Start with the 5-step workflow, use the lookup tables, and validate in Dash0.

**Happy converting! 🎉**

---

**Next**: [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md) for more examples, or jump to [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) for quick lookups.
