# Implementation Roadmap

## Current State

You now have **solid foundational documentation** that covers all aspects of dashboard conversion:

✅ **CONVERSION_STRATEGY.md** - High-level approach and architecture
✅ **DATADOG_QUERY_REFERENCE.md** - Datadog query language spec
✅ **PROMQL_REFERENCE.md** - PromQL patterns and functions
✅ **PERSES_DASHBOARD_FORMAT.md** - Dash0/Perses JSON structure
✅ **CONVERSION_MAPPINGS.md** - Lookup tables for all conversions
✅ **CONVERSION_GUIDE.md** - Step-by-step workflow

These documents provide everything needed to understand and maintain the conversion process.

---

## Next Phase: JavaScript Library

### Why a Library?

Current state of `convert.js`:
- ✅ Works for Apollo Router dashboards
- ❌ Ad-hoc logic scattered throughout
- ❌ Hard to test individual components
- ❌ Difficult to reuse conversion logic
- ❌ Complex to extend for new metric types

Benefits of a library:
- **Modularity**: Each conversion rule is a function
- **Testability**: Easy to test conversions in isolation
- **Reusability**: Can use in other projects
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Add new rules without refactoring
- **Documentation**: Self-documenting code

### Proposed Architecture

```
src/
├── index.js                    # Main library export
├── converters/
│   ├── dashboard.js            # Dashboard conversion orchestration
│   ├── widget.js               # Widget to panel conversion
│   └── query.js                # Query conversion engine
├── transforms/
│   ├── metric-type.js          # Metric type detection
│   ├── aggregation.js          # Aggregation translation
│   ├── attribute-mapping.js    # Label name mapping
│   └── promql-builder.js       # PromQL construction
├── rules/
│   ├── metric-types.json       # Metric type detection rules
│   ├── aggregations.json       # Aggregation patterns
│   ├── attributes.json         # Label mappings
│   └── panels.json             # Panel type mappings
├── plugins/
│   ├── prometheus.js           # Prometheus/PromQL plugin
│   └── datadog.js              # Datadog parser plugin
└── utils/
    ├── json.js                 # JSON helpers
    ├── string.js               # String transformation
    └── validation.js           # Validation helpers

test/
├── unit/
│   ├── metric-type.test.js
│   ├── aggregation.test.js
│   ├── query.test.js
│   └── ...
└── integration/
    ├── apollo-router.test.js   # Full Apollo Router template
    └── fixtures/
        ├── datadog-simple.json
        ├── datadog-complex.json
        └── expected-output/
```

### Phase 1: Core Library Structure

Create modular conversion functions:

```javascript
// src/transforms/metric-type.js
const METRIC_TYPE_RULES = [
  {
    pattern: /duration|latency|time/,
    type: 'histogram',
    confidence: 'high',
    description: 'Time measurements are histograms'
  },
  // ... more rules
];

function detectMetricType(metricName) {
  for (const rule of METRIC_TYPE_RULES) {
    if (rule.pattern.test(metricName)) {
      return { type: rule.type, confidence: rule.confidence };
    }
  }
  return { type: 'gauge', confidence: 'low' };
}

module.exports = { detectMetricType, METRIC_TYPE_RULES };
```

```javascript
// src/transforms/aggregation.js
const AGGREGATION_PATTERNS = {
  histogram: {
    count: 'histogram_sum(increase(...[5m]))',
    avg: 'histogram_avg(rate(...[5m]))',
    p95: 'histogram_quantile(0.95, rate(..._bucket[5m]))',
    // ...
  },
  gauge: {
    avg: 'avg(...)',
    sum: 'sum(...)',
    // ...
  },
  // ...
};

function translateAggregation(aggregation, metricType, options = {}) {
  const patterns = AGGREGATION_PATTERNS[metricType];
  if (!patterns || !patterns[aggregation]) {
    throw new Error(`No pattern for ${aggregation} on ${metricType}`);
  }
  return patterns[aggregation];
}

module.exports = { translateAggregation, AGGREGATION_PATTERNS };
```

```javascript
// src/converters/query.js
const { detectMetricType } = require('../transforms/metric-type');
const { translateAggregation } = require('../transforms/aggregation');
const { mapAttributeName } = require('../transforms/attribute-mapping');

function convertQuery(datadogQuery, options = {}) {
  // Parse Datadog query
  const parsed = parseDatadogQuery(datadogQuery);

  // Detect metric type
  const { type: metricType } = detectMetricType(parsed.metricName);

  // Translate aggregation
  const pattern = translateAggregation(
    parsed.aggregation,
    metricType,
    { hasGrouping: !!parsed.groupBy }
  );

  // Map attribute names
  const mappedLabels = (parsed.groupBy || [])
    .map(mapAttributeName);

  // Build PromQL
  const promql = buildPromQL(pattern, {
    metricName: parsed.metricName,
    groupBy: mappedLabels,
    filters: parsed.filters,
    // ...
  });

  return { promql, metricType };
}

module.exports = { convertQuery };
```

### Phase 2: Extract Current Logic

Refactor `convert.js` to use library:

```javascript
// convert.js (refactored)
const { convertDashboard } = require('./src/converters/dashboard');
const fs = require('fs');
const path = require('path');

const datadogDashboard = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'datadog', 'graphos-template.json'), 'utf8')
);

const result = convertDashboard(datadogDashboard, {
  dataset: 'default',
  refreshInterval: '30s',
  duration: '1h',
});

fs.writeFileSync(
  path.join(__dirname, 'dash0', 'apollo-router-performance.json'),
  JSON.stringify(result, null, 2)
);
```

### Phase 3: Testing

Create comprehensive test suite:

```javascript
// test/unit/metric-type.test.js
const { detectMetricType } = require('../../src/transforms/metric-type');

describe('detectMetricType', () => {
  test('detects histograms by duration', () => {
    expect(detectMetricType('http.server.request.duration').type)
      .toBe('histogram');
  });

  test('detects gauges for cache.size exception', () => {
    expect(detectMetricType('apollo.router.cache.size').type)
      .toBe('gauge');
  });

  test('detects sums by operations', () => {
    expect(detectMetricType('apollo.router.operations').type)
      .toBe('sum');
  });
});
```

```javascript
// test/integration/apollo-router.test.js
const { convertDashboard } = require('../../src/converters/dashboard');
const datadogTemplate = require('../fixtures/datadog-simple.json');
const expectedOutput = require('../fixtures/expected-output/simple.json');

describe('Apollo Router Dashboard Conversion', () => {
  test('converts complete dashboard correctly', () => {
    const result = convertDashboard(datadogTemplate);
    expect(result).toEqual(expectedOutput);
  });

  test('generates valid Perses format', () => {
    const result = convertDashboard(datadogTemplate);
    expect(result.kind).toBe('Dashboard');
    expect(result.metadata).toBeDefined();
    expect(result.spec.panels).toBeDefined();
  });
});
```

### Phase 4: Documentation & Examples

Create examples for the library:

```javascript
// examples/basic-conversion.js
const { convertQuery } = require('../src/converters/query');

// Example 1: Histogram percentile
const query1 = 'p95:http.server.request.duration{$service} by {subgraph.name}';
const result1 = convertQuery(query1);
console.log('Input:', query1);
console.log('Output:', result1.promql);

// Example 2: Gauge average
const query2 = 'avg:apollo.router.cache.size{$service} by {kind}';
const result2 = convertQuery(query2);
console.log('Input:', query2);
console.log('Output:', result2.promql);
```

---

## Implementation Timeline

### Week 1: Foundation
- Create library directory structure
- Extract metric type detection rules
- Create basic rule files (JSON)
- Write unit tests for individual transforms

### Week 2: Core Converters
- Build aggregation translator
- Build attribute name mapper
- Build PromQL builder
- Build query converter

### Week 3: Dashboard Converter
- Build widget converter
- Build dashboard orchestrator
- Integrate with existing convert.js
- Test against Apollo Router template

### Week 4: Polish & Docs
- Complete test coverage
- Write usage documentation
- Create example scripts
- Performance optimization

---

## Benefits of This Approach

### For Development
- ✅ Each function has single responsibility
- ✅ Easy to test individual components
- ✅ Easy to debug failures
- ✅ Clear error messages

### For Maintenance
- ✅ New team members understand structure quickly
- ✅ Rules are data-driven (JSON), easy to update
- ✅ Adding new metric type = add rule to JSON
- ✅ Documentation matches code

### For Extension
- ✅ Can add new query types (ScalarQuery, etc.)
- ✅ Can add new panel types
- ✅ Can support multiple source formats (Grafana, etc.)
- ✅ Can create Prometheus → Datadog converter

### For Reusability
- ✅ Publish as npm package
- ✅ Use in other projects
- ✅ Compose with other tools
- ✅ Build CLI/API on top

---

## Current `convert.js` → Library Mapping

| Current Function | Future Module |
|-----------------|---------------|
| `mapAttributeName()` | `src/transforms/attribute-mapping.js` |
| `getMetricType()` | `src/transforms/metric-type.js` |
| `convertToPromQL()` | `src/converters/query.js` |
| `generateQueryName()` | `src/converters/query.js` |
| `convertWidget()` | `src/converters/widget.js` |
| `extractWidgets()` | `src/utils/json.js` |
| `convertDashboard()` | `src/converters/dashboard.js` |

---

## Configuration Strategy

### Rules as Data

Instead of hardcoding rules, use JSON configs:

```json
// rules/metric-types.json
{
  "rules": [
    {
      "id": "duration",
      "pattern": "duration|latency|time",
      "type": "histogram",
      "confidence": "high"
    },
    {
      "id": "cache_size_exception",
      "pattern": "^apollo\\.router\\.cache\\.size$",
      "type": "gauge",
      "confidence": "high",
      "note": "Exception: cache.size is gauge not histogram"
    }
  ]
}
```

```json
// rules/aggregations.json
{
  "histogram": {
    "count": "histogram_sum(increase({metric}[5m]))",
    "avg": "histogram_avg(rate({metric}[5m]))",
    "p50": "histogram_quantile(0.50, rate({metric}_bucket[5m]))",
    "p95": "histogram_quantile(0.95, rate({metric}_bucket[5m]))"
  },
  "gauge": {
    "avg": "avg({metric})",
    "sum": "sum({metric})"
  }
}
```

Benefits:
- Rules are easy to update without code changes
- Easy to see all patterns at a glance
- Can validate rules separately
- Can generate documentation from rules

---

## Getting Started with Library Development

### Step 1: Create Directory Structure
```bash
mkdir -p src/{converters,transforms,rules,plugins,utils}
mkdir -p test/{unit,integration,fixtures/expected-output}
touch src/index.js
```

### Step 2: Create Package Configuration
```json
{
  "name": "@apollo-router/datadog-to-dash0",
  "version": "1.0.0",
  "main": "src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./converters": "./src/converters/index.js",
    "./transforms": "./src/transforms/index.js"
  }
}
```

### Step 3: Start with Core Rules
1. Create `src/rules/metric-types.json`
2. Create `src/rules/aggregations.json`
3. Create `src/rules/attributes.json`
4. Create loader for rules

### Step 4: Build Transforms
1. `src/transforms/metric-type.js`
2. `src/transforms/aggregation.js`
3. `src/transforms/attribute-mapping.js`
4. `src/transforms/promql-builder.js`

### Step 5: Build Converters
1. `src/converters/query.js`
2. `src/converters/widget.js`
3. `src/converters/dashboard.js`

### Step 6: Refactor `convert.js`
Use the library instead of inline logic.

---

## Success Criteria

- ✅ All current convert.js logic works identically with library
- ✅ 90%+ test coverage
- ✅ No dependencies beyond Node.js builtins
- ✅ Clear error messages for invalid inputs
- ✅ Documented API for all public functions
- ✅ Examples for common use cases
- ✅ Can easily add new metric types
- ✅ Can easily add new aggregations

---

## Alternative: Keep Simple

If full library seems overkill, **minimum viable improvements**:

1. **Extract rules to constants**
   - Move metric type rules to named constant
   - Move aggregation patterns to constant
   - Move attribute mappings to constant

2. **Split functions**
   - `convertToPromQL()` → `parseQuery()`, `detectType()`, `buildQuery()`
   - Better testability without full library

3. **Add comments**
   - Document each rule with why it exists
   - Document decision logic in functions

This is faster (1-2 days) but less maintainable long-term.

---

## Decision: Library or Simple Refactor?

**Choose Library if**:
- Plan to support multiple source formats (Grafana, others)
- Want to build tools/CLI on top
- Anticipate many metric type additions
- Want high test coverage
- Plan to open-source

**Choose Simple Refactor if**:
- Only need this for Apollo Router
- Want quick 80/20 improvement
- Limited time/resources
- Don't need extensibility

---

## Recommendation

**Start with simple refactor** (extract rules to constants, add documentation), then **upgrade to library if needed**.

This gives you:
- Immediate improvement to code clarity
- Clear path to library later
- Less initial overhead
- Ability to assess if full library needed

The documentation you've already created supports either path.

---

## Future: Multi-Format Support (Grafana, New Relic, etc.)

### Vision: Unified Conversion Framework

While the current focus is Datadog → Dash0, the JavaScript library can be architected to support **multiple dashboard source formats**:

```
Different Sources → Unified PromQL → Dash0 (Perses)

Datadog    ─┐
Grafana    ─┼─→ [Conversion Library] ─→ PromQL → Perses Format → Dash0
New Relic  ─┘
CloudWatch ─┘
```

### Why Multi-Format?

1. **Reuse**: PromQL builder and Perses generator used for all formats
2. **Efficiency**: Shared infrastructure for multiple conversions
3. **Consistency**: All dashboards converted the same way
4. **Extensibility**: Adding new format = new plugin, not refactoring
5. **Open Source**: More valuable if supports multiple sources

### Format Difficulty Levels

| Format | Query Translation | Effort | When |
|--------|------------------|--------|------|
| **Datadog** | Complex (Datadog syntax → PromQL) | ✅ Current | Now |
| **Grafana** | Minimal (Already PromQL) | Easy | After Datadog stable |
| **New Relic** | Complex (NRQL → PromQL) | Medium | Future phase |
| **CloudWatch** | Complex (New language) | Medium | Future phase |

### Why Grafana is Easier

Grafana dashboards **already use Prometheus/PromQL**, so:
- No query translation needed (main work in Datadog)
- Focus is on panel type mapping
- Variable handling is similar
- Effort: 1-2 weeks after library setup

### Why New Relic is More Complex

New Relic uses **NRQL** (completely different query language):
- Need NRQL → PromQL translator (similar to Datadog work)
- Different metric naming and structure
- Different aggregation model
- Effort: 3-4 weeks after library setup

### Plugin Architecture Approach

```
src/
├── core/
│   ├── converter.js          # Shared conversion logic
│   ├── promql-builder.js     # Generate PromQL (shared)
│   └── perses-builder.js     # Generate Perses JSON (shared)
├── sources/                  # Format-specific plugins
│   ├── datadog/
│   │   ├── parser.js         # Parse Datadog JSON
│   │   ├── query-translator.js  # Datadog → PromQL
│   │   └── panel-mapper.js   # Map panel types
│   ├── grafana/
│   │   ├── parser.js         # Parse Grafana JSON
│   │   ├── query-translator.js  # (pass-through, mostly)
│   │   └── panel-mapper.js   # Map Grafana types
│   ├── newrelic/
│   │   ├── parser.js         # Parse New Relic JSON
│   │   ├── query-translator.js  # NRQL → PromQL
│   │   └── panel-mapper.js   # Map New Relic types
│   └── cloudwatch/           # (future)
└── targets/
    └── perses/
        ├── generator.js
        └── validator.js
```

### Documentation for Multiple Formats

Documentation naturally supports multi-format:

**Shared (same for all)**:
- PROMQL_REFERENCE.md (target language)
- PERSES_DASHBOARD_FORMAT.md (output format)

**Format-specific**:
- DATADOG_QUERY_REFERENCE.md (add GRAFANA_REFERENCE.md, NEWRELIC_REFERENCE.md)
- CONVERSION_MAPPINGS.md (add format-specific tables)

**Example**: Adding Grafana would require:
- GRAFANA_DASHBOARD_REFERENCE.md (structure, panel types)
- GRAFANA_CONVERSION_GUIDE.md (how to convert)
- Update CONVERSION_MAPPINGS.md with Grafana-specific rules

### Timeline for Multi-Format

1. **Phase 1 (Now)**: Datadog → Dash0 complete ✅
2. **Phase 2 (1-2 weeks)**: Refactor to plugin architecture
3. **Phase 3 (3-4 weeks)**: Add Grafana support
4. **Phase 4 (4-6 weeks)**: Add New Relic support
5. **Phase 5 (Future)**: Add CloudWatch, others

### Recommendation

1. **Complete Datadog first** - Don't over-engineer upfront
2. **Refactor to plugins** - After Datadog is solid
3. **Add Grafana** - Good learning for plugin system
4. **Consider open-source** - More valuable with multi-format support
5. **Add New Relic** - If market demand exists

The current documentation package supports this evolution naturally without needing changes.

---

## Next Steps

1. **Review** the reference documents with your team
2. **Decide** on library vs. simple refactor approach
3. **Plan** implementation timeline
4. **Assign** tasks if team-based
5. **Start** with Phase 1 (foundation/rules)

### For Multi-Format Consideration

- Would Grafana support be valuable for your use case?
- Is New Relic a source format you care about?
- Should we plan for plugin architecture now or later?
- Interest in open-sourcing this eventually?

Would you like help with:
- Creating the library structure?
- Writing the rules JSON files?
- Refactoring the current convert.js?
- Creating test cases?
- Planning multi-format support?
