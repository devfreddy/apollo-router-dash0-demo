# Error Injection Configuration

This document explains how to configure and use the error injection feature in the Apollo Router demo for chaos testing and observability validation.

## Overview

Error injection allows you to randomly inject GraphQL errors into subgraph resolvers, simulating service failures without needing to actually break anything. This is useful for:

- **Chaos Testing**: Testing how your system handles failures
- **Observability Validation**: Verifying that errors are properly tracked and reported in your observability platform
- **Error Rate Monitoring**: Testing alert rules and dashboards for error rate thresholds
- **Resilience Testing**: Validating retry logic and circuit breaker behavior

## Architecture

### Node.js Subgraphs

The error injection for Node.js subgraphs (`accounts`, `inventory`, `products`, `reviews`) uses a shared utility located at:

- **File**: `subgraphs/shared/error-injection.js`
- **Key Functions**:
  - `getErrorRate(serviceName, defaultRate)`: Retrieves error rate from environment variables
  - `shouldInjectError(errorRate)`: Probabilistically determines if error should be injected
  - `createGraphQLError(message, extensions)`: Creates a GraphQL-compatible error
  - `withErrorInjection(resolver, serviceName, errorRate, errorMessage)`: Wrapper function for resolvers

Each resolver is wrapped with `withErrorInjection()` to add error injection capability. The default error rate is 5% (1 in 20 requests).

**Example**:
```javascript
me: withErrorInjection(
  () => {
    return users[Math.floor(Math.random() * users.length)];
  },
  'accounts-subgraph',
  5,
  'Failed to fetch current user'
),
```

### Python Subgraph

The Python subgraph (`products-py`) uses a similar error injection utility:

- **File**: `subgraphs/products-py/error_injection.py`
- **Key Functions**:
  - `get_error_rate(service_name, default_rate)`: Retrieves error rate from environment
  - `should_inject_error(error_rate)`: Probabilistically determines if error should be injected
  - `ErrorInjectionException`: Custom exception class for error injection
  - `with_error_injection()`: Decorator for wrapping resolvers (async-aware)

Errors are injected directly in query resolvers before the main logic:

**Example**:
```python
@strawberry.field
def products(self) -> List[Product]:
    """Get all products."""
    if should_inject_error(5):
        raise ErrorInjectionException("Failed to fetch products")

    # ... rest of resolver logic
```

## Configuration

### Environment Variables

Error injection is controlled via environment variables. Set these in your `.env` file:

```bash
# Accounts Subgraph Error Rate (0-100)
ACCOUNTS_SUBGRAPH_ERROR_RATE=5

# Reviews Subgraph Error Rate (0-100)
REVIEWS_SUBGRAPH_ERROR_RATE=5

# Products Subgraph Error Rate (0-100)
PRODUCTS_SUBGRAPH_ERROR_RATE=5

# Inventory Subgraph Error Rate (0-100)
INVENTORY_SUBGRAPH_ERROR_RATE=5

# Products Python Subgraph Error Rate (0-100)
PRODUCTS_SUBGRAPH_PY_ERROR_RATE=5
```

### Error Rate Values

- **0**: No errors injected (production-like)
- **5**: 5% of requests fail (1 in 20) - recommended for testing
- **10**: 10% of requests fail (1 in 10)
- **25**: 25% of requests fail (1 in 4)
- **50**: 50% of requests fail (every other request)
- **100**: All requests fail

## Usage Examples

### 1. Testing with Moderate Error Rate

Start with a 5-10% error rate to simulate occasional failures:

```bash
# .env file
ACCOUNTS_SUBGRAPH_ERROR_RATE=5
REVIEWS_SUBGRAPH_ERROR_RATE=5
PRODUCTS_SUBGRAPH_ERROR_RATE=5
INVENTORY_SUBGRAPH_ERROR_RATE=5
PRODUCTS_SUBGRAPH_PY_ERROR_RATE=5
```

Then run your tests or load tests:

```bash
docker-compose up
# The router will receive occasional errors from subgraphs
```

### 2. Testing Error Handling Paths

Increase error rates to 50% to test your error handling:

```bash
ACCOUNTS_SUBGRAPH_ERROR_RATE=50
REVIEWS_SUBGRAPH_ERROR_RATE=0  # Keep this clean
PRODUCTS_SUBGRAPH_ERROR_RATE=0  # Keep this clean
```

### 3. Testing Specific Subgraph Failures

Test how your system handles a specific subgraph failing:

```bash
# All subgraphs work normally except accounts
ACCOUNTS_SUBGRAPH_ERROR_RATE=100
REVIEWS_SUBGRAPH_ERROR_RATE=0
PRODUCTS_SUBGRAPH_ERROR_RATE=0
INVENTORY_SUBGRAPH_ERROR_RATE=0
PRODUCTS_SUBGRAPH_PY_ERROR_RATE=0
```

### 4. Chaos Testing

Inject high error rates everywhere:

```bash
# Simulate widespread outage
ACCOUNTS_SUBGRAPH_ERROR_RATE=25
REVIEWS_SUBGRAPH_ERROR_RATE=25
PRODUCTS_SUBGRAPH_ERROR_RATE=25
INVENTORY_SUBGRAPH_ERROR_RATE=25
PRODUCTS_SUBGRAPH_PY_ERROR_RATE=25
```

## Error Handling in OpenTelemetry

When errors are injected, they are:

1. **Raised as GraphQL Errors**: The errors propagate through the GraphQL execution with appropriate error codes
2. **Tracked as Spans**: OpenTelemetry automatically captures error information in spans
3. **Recorded as Events**: Errors create events in the trace data
4. **Reported to Observability Platform**: All errors are exported to Dash0 for monitoring

### How Errors Appear in Dashboards

- **Error Rate Metrics**: Injected errors contribute to error rate calculations
- **Error Traces**: Each error creates a trace entry visible in Dash0
- **Error Logs**: Errors are logged and visible in log dashboards
- **Alert Triggers**: High error rates can trigger configured alerts

## Troubleshooting

### Errors Not Appearing

1. **Check environment variables are loaded**:
   ```bash
   echo $ACCOUNTS_SUBGRAPH_ERROR_RATE
   ```

2. **Verify subgraph containers are restarted** with new environment:
   ```bash
   docker-compose restart
   ```

3. **Check error rate value is > 0**:
   ```bash
   # This won't inject any errors
   ACCOUNTS_SUBGRAPH_ERROR_RATE=0
   ```

### Too Many Errors

Reduce the error rate:
```bash
ACCOUNTS_SUBGRAPH_ERROR_RATE=1  # 1% error rate
```

### Errors Not Being Tracked

Verify OpenTelemetry is properly configured:
- Check DASH0_AUTH_TOKEN is set
- Verify DASH0_TRACES_ENDPOINT is reachable
- Check logs for OpenTelemetry initialization messages

## Error Messages

Each subgraph includes contextual error messages:

| Subgraph | Error Message |
|----------|---------------|
| Accounts | "Failed to fetch current user", "Failed to fetch user", "Failed to fetch users" |
| Reviews | "Failed to fetch product for review", "Failed to fetch author for review", "Failed to fetch user reviews", "Failed to fetch product reviews" |
| Products (Node.js) | "Failed to fetch products", "Failed to fetch product", "Failed to fetch top products" |
| Inventory | "Failed to fetch inventory" |
| Products (Python) | "Failed to fetch products", "Failed to fetch product", "Failed to fetch top products", "Failed to fetch products by category", "Failed to fetch products in stock", "Failed to search products" |

## Implementation Details

### Node.js Implementation

Error injection in Node.js uses the `withErrorInjection` wrapper:

```javascript
const { withErrorInjection } = require('../shared/error-injection');

// Wrap your resolver
const resolvers = {
  Query: {
    me: withErrorInjection(
      () => users[0],
      'accounts-subgraph',
      5,
      'Failed to fetch current user'
    )
  }
};
```

The wrapper:
1. Checks the error rate from environment variables
2. Probabilistically decides whether to inject an error (5% by default)
3. Either throws a GraphQL error or calls the resolver

### Python Implementation

Error injection in Python uses try-except inside resolvers:

```python
@strawberry.field
def products(self) -> List[Product]:
    if should_inject_error(5):
        raise ErrorInjectionException("Failed to fetch products")

    # normal resolver logic
    return products_list
```

The approach:
1. Checks at the start of the resolver
2. Probabilistically throws an ErrorInjectionException
3. Continues with normal resolution if no error is injected

## Performance Impact

- **No Error Injection (0%)**: Zero performance overhead
- **With Error Injection**: <1ms overhead per request (just a random number check)
- **Error Creation**: Minimal impact, GraphQL errors are lightweight objects

## Best Practices

1. **Start Low**: Begin with 5% error rate and increase as needed
2. **Test Incrementally**: Test one subgraph at a time
3. **Monitor Dashboards**: Watch your observability platform while testing
4. **Reset After Testing**: Set error rates back to 0 when done
5. **Document Test Scenarios**: Keep track of what error rates you're testing
6. **Use Git**: Commit your test scenarios for reproducibility

## Disabling Error Injection

To disable error injection entirely:

```bash
# Set all error rates to 0
ACCOUNTS_SUBGRAPH_ERROR_RATE=0
REVIEWS_SUBGRAPH_ERROR_RATE=0
PRODUCTS_SUBGRAPH_ERROR_RATE=0
INVENTORY_SUBGRAPH_ERROR_RATE=0
PRODUCTS_SUBGRAPH_PY_ERROR_RATE=0
```

Or simply don't set the environment variables (they default to 0).

## Integration with Observability

Injected errors are fully integrated with your observability stack:

1. **Traces**: Each error creates a trace with appropriate status codes
2. **Metrics**: Error rates are tracked in metrics
3. **Logs**: Error details are included in structured logs
4. **Alerts**: Your configured alerts will fire based on error rates

This allows you to validate your entire observability pipeline end-to-end.
