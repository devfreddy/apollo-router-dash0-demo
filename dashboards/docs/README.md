# Dashboard Conversion Documentation

Complete reference for converting Datadog dashboards to Dash0 (Perses format).

---

## 📚 Documentation Structure

### Getting Started ⭐
- **[QUICK_START.md](QUICK_START.md)** - **START HERE (5 minutes)**
  - Quick 5-step workflow
  - Common patterns cheat sheet
  - Validation checklist
  - Pro tips

- **[CONVERSION_GUIDE.md](CONVERSION_GUIDE.md)** - Detailed guide
  - Step-by-step workflow for converting queries
  - Common patterns with examples
  - Quick reference tables
  - Troubleshooting tips

### Reference Materials
- **[DATADOG_QUERY_REFERENCE.md](DATADOG_QUERY_REFERENCE.md)** - Datadog query syntax
  - Metric query structure
  - Aggregation functions (count, avg, sum, pXX)
  - Filters and template variables
  - Common patterns from Apollo Router template
  - Metric types (count, gauge, histogram)

- **[PROMQL_REFERENCE.md](PROMQL_REFERENCE.md)** - PromQL patterns and functions
  - PromQL basics (metrics, labels, vectors)
  - Operator functions (sum, avg, max, min)
  - Range vector functions (rate, increase, irate)
  - Histogram functions (histogram_quantile, histogram_sum, histogram_avg)
  - Common patterns for Apollo Router monitoring

- **[PERSES_DASHBOARD_FORMAT.md](PERSES_DASHBOARD_FORMAT.md)** - Dash0/Perses JSON structure
  - Dashboard top-level structure
  - Metadata and spec sections
  - Panel definitions
  - Query definitions
  - Complete examples

- **[CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md)** - Lookup tables
  - Metric type detection rules
  - Aggregation translation patterns
  - Attribute/label name mapping
  - Panel type mapping
  - Decision trees

### Planning & Implementation
- **[CONVERSION_STRATEGY.md](CONVERSION_STRATEGY.md)** - High-level strategy
  - Current state assessment
  - Solution architecture
  - Conversion rules by metric type
  - Testing strategy
  - Maintenance approach

- **[IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)** - Next steps
  - JavaScript library architecture proposal
  - Phased implementation plan
  - Benefits and trade-offs
  - Multi-format support (Grafana, New Relic)
  - Getting started guide

### Project Overview
- **[CLEANUP_SUMMARY.md](CLEANUP_SUMMARY.md)** - What was created
  - Deliverables overview
  - Problems solved
  - Value delivered
  - Statistics and metrics
  - Next phase recommendations

---

## 🚀 Quick Start Workflow

### For Converting a Single Query

1. **Open** [CONVERSION_GUIDE.md](CONVERSION_GUIDE.md)
2. **Follow** the 5-step workflow
3. **Reference** [CONVERSION_MAPPINGS.md](CONVERSION_MAPPINGS.md) for table lookups
4. **Validate** in Dash0 query editor

### For Understanding the Full Approach

1. **Read** [CONVERSION_STRATEGY.md](CONVERSION_STRATEGY.md) for context
2. **Study** [DATADOG_QUERY_REFERENCE.md](DATADOG_QUERY_REFERENCE.md) to understand Datadog syntax
3. **Learn** [PROMQL_REFERENCE.md](PROMQL_REFERENCE.md) for PromQL patterns
4. **Reference** [PERSES_DASHBOARD_FORMAT.md](PERSES_DASHBOARD_FORMAT.md) for JSON structure

### For Next Phase Development

1. **Read** [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)
2. **Review** proposed JavaScript library architecture
3. **Plan** phased implementation
4. **Start** with Phase 1 (foundation)

---

## 📋 Document Overview

| Document | Length | Purpose | Audience |
|----------|--------|---------|----------|
| CONVERSION_GUIDE.md | ~8 pages | Practical how-to | Anyone converting dashboards |
| DATADOG_QUERY_REFERENCE.md | ~7 pages | Syntax reference | Anyone working with Datadog queries |
| PROMQL_REFERENCE.md | ~9 pages | PromQL patterns | Anyone writing PromQL |
| PERSES_DASHBOARD_FORMAT.md | ~11 pages | Format specification | Developers building dashboards |
| CONVERSION_MAPPINGS.md | ~10 pages | Lookup tables | Quick reference during conversion |
| CONVERSION_STRATEGY.md | ~10 pages | Architectural strategy | Team leads, architects |
| IMPLEMENTATION_ROADMAP.md | ~8 pages | Implementation plan | Developers, tech leads |

**Total**: ~63 pages of comprehensive documentation

---

## 🎯 Key Concepts

### Metric Types
- **Histogram**: Duration, latency, size metrics
- **Gauge**: Current values (cache size, queue depth)
- **Sum/Counter**: Monotonic counters (requests, errors)

### Conversion Patterns
- Histograms: Use `histogram_*()` functions with `rate()` or `increase()`
- Gauges: Use simple aggregators, NO `rate()`
- Counters: Use `rate()` for per-second, `increase()` for total

### Critical Rules
1. Metric type determines PromQL function choice
2. Aggregation function must match metric type
3. Always include `le` label in histogram percentiles
4. Replace metric name dots with underscores
5. Map attribute names using provided tables

---

## 💡 Common Questions

**Q: Where do I find how to convert a specific metric?**
A: Start with CONVERSION_GUIDE.md step 2, then use CONVERSION_MAPPINGS.md Table 1

**Q: What's the difference between rate() and increase()?**
A: See PROMQL_REFERENCE.md → "Rate vs Increase" section

**Q: Why is histogram_quantile() used for percentiles?**
A: See PROMQL_REFERENCE.md → "Histogram Functions" section

**Q: How do I structure a Perses dashboard JSON?**
A: See PERSES_DASHBOARD_FORMAT.md → complete examples

**Q: What about converting non-Apollo Router dashboards?**
A: The principles apply, see CONVERSION_STRATEGY.md for generalizable approach

**Q: Should we build a JavaScript library?**
A: See IMPLEMENTATION_ROADMAP.md for pros/cons and implementation plan

---

## 🔗 External References

### Datadog
- [Datadog Metrics Documentation](https://docs.datadoghq.com/metrics/)
- [Datadog APM Metrics](https://docs.datadoghq.com/tracing/metrics/)

### PromQL & Prometheus
- [PromQL Documentation](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [PromQL Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

### OpenTelemetry
- [OpenTelemetry Metrics Spec](https://opentelemetry.io/docs/specs/otel/metrics/)

### Perses & Dash0
- [Perses Documentation](https://docs.perses.dev/)
- [Dash0 Documentation](https://www.dash0.com/documentation/dash0/dashboards)
- [Dash0 API Docs](https://api-docs.dash0.com/)

### Apollo Router
- [Apollo Router APM Configuration](https://www.apollographql.com/docs/router/configuration/telemetry/apm/)
- [Apollo GraphOS APM Templates](https://github.com/apollographql/apm-templates)

---

## 📝 Document Maintenance

These documents are living resources. When you:

- **Encounter a new metric type**: Add rule to CONVERSION_MAPPINGS.md Table 1
- **Discover a new PromQL pattern**: Add to PROMQL_REFERENCE.md
- **Hit a conversion edge case**: Document in CONVERSION_GUIDE.md "Pitfalls"
- **Make a decision about library**: Update IMPLEMENTATION_ROADMAP.md
- **Change conversion rules**: Update CONVERSION_MAPPINGS.md and PROMQL_REFERENCE.md

---

## ✅ Checklist: All Docs Complete

- ✅ CONVERSION_GUIDE.md - Practical workflow
- ✅ DATADOG_QUERY_REFERENCE.md - Datadog syntax
- ✅ PROMQL_REFERENCE.md - PromQL patterns
- ✅ PERSES_DASHBOARD_FORMAT.md - JSON structure
- ✅ CONVERSION_MAPPINGS.md - Lookup tables
- ✅ CONVERSION_STRATEGY.md - High-level strategy
- ✅ IMPLEMENTATION_ROADMAP.md - Next steps
- ✅ docs/README.md - This index

---

## 🎓 Learning Path

### For Quick Answer (5 min)
1. Use CONVERSION_MAPPINGS.md tables
2. Find your scenario in CONVERSION_GUIDE.md examples

### For Understanding (30 min)
1. Read CONVERSION_GUIDE.md completely
2. Skim PROMQL_REFERENCE.md for context
3. Try converting one query

### For Deep Knowledge (2-3 hours)
1. Read all reference documents in order
2. Study examples in each document
3. Try converting complete dashboard
4. Review CONVERSION_STRATEGY.md for patterns

### For Implementation (team discussion)
1. Review IMPLEMENTATION_ROADMAP.md
2. Discuss library vs simple refactor
3. Plan implementation phases
4. Assign tasks

---

## 🤝 Contributing

To improve these docs:

1. **Fix errors**: Correct any inaccuracies
2. **Add examples**: Include real-world examples
3. **Clarify sections**: Improve unclear explanations
4. **Add patterns**: Document new metric/aggregation patterns
5. **Update references**: Add new external links

Keep documents:
- Organized and easy to navigate
- Self-contained (can read independently)
- Well-illustrated with examples
- Linked to related documents

---

Good luck with your dashboard conversions! 🚀
