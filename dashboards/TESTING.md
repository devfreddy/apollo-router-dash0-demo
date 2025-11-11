# Testing Guide

This project includes comprehensive unit tests for the dashboard converter modules.

## Test Structure

Tests are organized in `__tests__/` directory with one test file per module:

- `metric-type.test.js` - Tests for metric type detection (histogram, gauge, sum)
- `attribute-mapper.test.js` - Tests for Datadog→Dash0 label name mapping
- `promql-converter.test.js` - Tests for Datadog query→PromQL conversion
- `widget-converter.test.js` - Tests for Datadog widget→Perses panel conversion

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

Current coverage (all core modules):

| Module | Statements | Branches | Functions | Lines |
|--------|------------|----------|-----------|-------|
| attribute-mapper.js | 100% | 100% | 100% | 100% |
| metric-type.js | 100% | 100% | 100% | 100% |
| promql-converter.js | 88.69% | 83.69% | 100% | 89.18% |
| widget-converter.js | 100% | 94.11% | 100% | 100% |
| **Overall** | **93.77%** | **88.67%** | **100%** | **94.02%** |

## Test Coverage Targets

Jest is configured with coverage thresholds:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

All modules exceed these minimums. Tests will fail if coverage drops below these thresholds.

## What's Tested

### metric-type.test.js (18 test cases)

Tests metric type detection rules:
- Histogram detection (duration, time, body.size, query planning)
- Cache size exception (gauge despite "size" in name)
- Sum/Counter detection (operations, errors, totals)
- Gauge detection (cache, sessions, connections, etc.)
- Default behavior (unknown metrics default to gauge)
- Rule precedence (exception rules take priority)
- Custom rule sets
- Edge cases (case sensitivity, special characters)
- Real-world Apollo Router metrics

### attribute-mapper.test.js (19 test cases)

Tests label name mapping:
- Explicit mappings (http.response.status_code → http_status_code)
- Dot-to-underscore conversion (service.name → service_name)
- Resource name mapping (host → dash0_resource_name)
- GROUP BY extraction (explicit `by {}` syntax)
- Wildcard filters as grouping (label:* syntax)
- Label mapping in GROUP BY
- Complex queries with multiple groupings
- Real-world Datadog queries
- Edge cases (empty strings, special characters)

### promql-converter.test.js (57 test cases)

Tests query conversion (most critical module):
- Percentile queries with/without GROUP BY
- Count queries (.as_rate(), .as_count(), default)
- Sum queries (different behavior per metric type)
- Average and Max/Min queries
- Filter handling (exact match, wildcards, negation)
- Label mapping in filters and GROUP BY
- otel_metric_name and otel_metric_type metadata
- Time window (always 2m)
- Metric type awareness (histogram vs gauge vs sum)
- Real-world Apollo Router queries
- Edge cases (invalid queries, whitespace)

### widget-converter.test.js (62 test cases)

Tests widget-to-panel conversion:
- Query name generation (by service, p95, etc.)
- Markdown widget conversion
- Timeseries widget conversion
- StatChart widget conversion (query_value type)
- Multiple queries in single widget
- Widget type handling (group, split_group, note, timeseries)
- Query conversion and PromQL generation
- Recursive widget extraction from nested groups
- Real-world panels (request duration, operations count, etc.)
- Edge cases (missing queries, invalid types)

## Writing New Tests

### Test Structure

```javascript
describe('Module or function name', () => {
  describe('Specific behavior', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Best Practices

1. **Test behavior, not implementation** - Focus on inputs and outputs
2. **Use descriptive test names** - Should read like documentation
3. **Test edge cases** - Empty inputs, null values, special characters
4. **Test error conditions** - What happens with invalid input?
5. **Real-world examples** - Include actual Apollo Router query patterns
6. **Group related tests** - Use nested `describe()` blocks

### Example: Adding Tests for New Function

```javascript
const { newFunction } = require('../src/new-module');

describe('newFunction', () => {
  describe('Normal cases', () => {
    it('should handle basic input', () => {
      expect(newFunction('input')).toBe('expected');
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty input', () => {
      expect(newFunction('')).toBeNull();
    });
  });
});
```

## Debugging Tests

### Run Single Test File
```bash
npm test metric-type.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="Percentile"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

Tests are designed to be runnable in CI/CD pipelines:
- All tests pass without external dependencies
- No database or network calls required
- Config files loaded from `src/config/`
- Fast execution (< 1 second)

## Maintenance

When updating converter logic:
1. Run tests to ensure no regressions
2. Add tests for any new behaviors
3. Update coverage if new branches added
4. Keep test descriptions accurate

## Common Issues

### Tests Fail on New Rules

If you add new metric type rules:
1. Tests may fail if they depend on specific type detection
2. Update affected tests or add new test cases for new rule
3. Run coverage report to ensure new branches tested

### Whitespace/Format Sensitive Tests

Some tests check exact string output (PromQL). If you change formatting:
1. Update the test expectations
2. Consider if the change affects query correctness
3. Test against Dash0 after making changes

## Further Reading

- Jest documentation: https://jestjs.io/docs/getting-started
- Project conversion logic: See `src/promql-converter.js` comments
- Config files: See `src/config/` for metric types, mappings, patterns
