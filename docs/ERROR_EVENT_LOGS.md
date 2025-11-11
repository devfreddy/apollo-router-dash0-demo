# Apollo Router Custom Error Event Logs

This guide explains how custom error event logs are configured in the Apollo Router for Kubernetes and how bad queries are used to generate observable error events.

## Overview

The Apollo Router has been configured with enhanced error event logging to capture and report GraphQL errors, validation errors, and other error conditions. These events are logged to stdout and exported to Dash0 for observability.

## Log Format Configuration

The Apollo Router outputs logs in **unstructured text format** rather than JSON. This allows Dash0 to demonstrate its intelligent log parsing and field extraction capabilities.

### Text Format Features

The text format is configured in `kubernetes/helm-values/router-values.yaml` under `telemetry.exporters.logging.stdout.format.text` with the following display options:

- **timestamp** - ISO8601 timestamp with nanosecond precision
- **level** - Log severity (ERROR, WARN, INFO, DEBUG, TRACE)
- **filename** - Source file location for debugging
- **line_number** - Line number in source code
- **target** - Module path (e.g., apollo_router)
- **thread_name** - Thread/tokio worker identification
- **current_span** - Current OpenTelemetry span context
- **resource** - Service and environment metadata

This unstructured format means the logs will appear as free-form text in stdout, giving you an opportunity to see how Dash0 intelligently parses and extracts structured fields from unformatted logs.

## Configuration in router-values.yaml

The error event logging is configured in `kubernetes/helm-values/router-values.yaml` under `telemetry.instrumentation.events.supergraph`.

### Event Types

#### 1. GraphQL Error Detection (`graphql.error.detected`)

Logs whenever a GraphQL error is detected in a response.

**Trigger Condition:** `on_graphql_error: true`

**Log Level:** `error`

**Captured Attributes:**
- `error.message` - The error message from the GraphQL response
- `error.code` - The error code (from extensions.code)
- `error.path` - The GraphQL path where the error occurred
- `error.locations` - Line/column information for the error
- `error.full.error` - The complete error object
- `graphql.operation.type` - The operation type (query, mutation, subscription)
- `http.status_code` - The HTTP status code

**Example Output (Unstructured Text Format):**
```
2025-11-10T10:30:45.123456Z ERROR apollo_router [apollo_router:165] thread_name="tokio-runtime-worker": GraphQL error in request span=[abc123def456 xyz789uvw012] service_name=apollo-router
```

**Log Format Details:**
The router uses unstructured text format to allow Dash0 to perform intelligent parsing and extraction. Key components:
- **Timestamp:** ISO8601 format with nanosecond precision
- **Level:** ERROR, WARN, INFO, DEBUG, TRACE
- **Target:** Module path (apollo_router)
- **Filename:Line:** Source code location if enabled
- **Thread name:** Tokio runtime worker identification
- **Message:** Primary log message
- **Span context:** trace_id and span_id in OpenTelemetry format
- **Resource attributes:** Service name and other context

#### 2. Validation Error Logging (`graphql.validation.error`)

Logs validation errors with error count.

**Trigger Condition:** `on_graphql_error: true`

**Log Level:** `error`

**Captured Attributes:**
- `error.count` - Number of validation errors
- `error.message` - First error message

#### 3. Router-Level Errors

Router-level errors are also captured through the `router.error` event configuration.

## Bad Query Setup in Kubernetes

Five types of bad queries are included in the vegeta load testing configuration to generate errors:

### 1. Invalid Field Query (`bad-invalid-field.json`)

```graphql
query BadInvalidField {
  me {
    name
    username
    invalidField  # This field doesn't exist
  }
}
```

**Error Type:** GraphQL validation error
**Error Code:** `GRAPHQL_VALIDATION_FAILED`

### 2. Syntax Error Query (`bad-syntax-error.json`)

```graphql
query BadSyntax {
  me name username  # Missing braces syntax
}
```

**Error Type:** GraphQL parse error
**Error Code:** `GRAPHQL_PARSE_FAILED`

### 3. Missing Query Field (`bad-missing-field.json`)

```graphql
query BadMissing {
  nonExistentQuery { name }  # This query doesn't exist
}
```

**Error Type:** GraphQL validation error
**Error Code:** `GRAPHQL_VALIDATION_FAILED`

### 4. Invalid Argument (`bad-null-argument.json`)

```graphql
query BadArgument {
  topProducts(first: null) { name price }  # null may not be valid
}
```

**Error Type:** GraphQL validation error
**Error Code:** `GRAPHQL_VALIDATION_FAILED`

### 5. Deeply Nested Query (`bad-deeply-nested.json`)

```graphql
query BadDeeplyNested {
  me {
    reviews {
      product {
        reviews {
          product {
            reviews {
              product {
                reviews {
                  product {
                    reviews { product { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Error Type:** May trigger depth limit violations or performance issues
**Error Code:** `GRAPHQL_EXECUTION_ERROR` or similar

## Vegeta Load Testing Configuration

Bad queries are distributed among the vegeta attack targets. With an attack rate of 5 requests/sec and 65 total requests in the targets file:

- **Good queries:** ~55 requests (~4.2 req/sec)
- **Bad queries:** ~5 requests (~0.4 req/sec - ~8% error rate)

This means errors will be generated approximately every 2-3 seconds, providing consistent observability data without overwhelming the system.

### Current Targets File Structure

The `targets.http` file in the vegeta ConfigMap includes:

1. **Normal queries** (0-9 variants):
   - reviews.json, reviews1.json, ... reviews9.json
   - products.json, products1.json, ... products9.json
   - large.json, large1.json, ... large4.json
   - recommended.json, recommended1.json, ... recommended9.json
   - Basic queries: accounts-me.json, accounts-users.json, products-inventory.json, federated-all.json

2. **Bad queries** (newly added):
   - bad-invalid-field.json
   - bad-syntax-error.json
   - bad-missing-field.json
   - bad-null-argument.json
   - bad-deeply-nested.json

## Testing the Error Event Logs

### Deploy with Error Event Logging

```bash
# Update Kubernetes with new router configuration
./kubernetes/scripts/update-configmap.sh

# Redeploy router
./kubernetes/scripts/redeploy-router.sh
```

### View Router Logs

```bash
# Watch router logs in real-time
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo

# View specific error events
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo | grep "error"
```

### Monitor in Dash0

1. Check **Error Events** dashboard in Dash0
2. Look for events with level "error"
3. Filter by operation name to see which bad queries triggered errors
4. Observe error.message and error.code attributes

### Query Error Metrics with PromQL

```promql
# Count of GraphQL errors per operation
rate(http_server_request_duration_count{graphql_errors="true"}[5m])

# Error rate by operation name
sum(rate(http_server_request_duration_count{graphql_errors="true"}[5m])) by (graphql_operation_name)

# HTTP error responses
rate(http_server_request_duration_count{http_response_status_code=~"[45].."}[5m])
```

## Modifying Error Injection Rate

To change the ratio of bad queries to good queries:

1. Edit `kubernetes/base/vegeta.yaml`
2. Modify or add more bad query references in the `targets.http` section
3. Adjust the comment on attack rate if needed (line ~389)
4. Redeploy:
   ```bash
   kubectl apply -k kubernetes/overlays/vegeta
   ```

## Integration with Observability

### OpenTelemetry Exporter Configuration

Error events are exported through:
- **Logs:** Stdout JSON logger (configured in `exporters.logging.stdout`)
- **Traces:** Captured as span events in the supergraph span
- **Metrics:** Error count tracked in `graphql.errors` attribute

### Log Export to Dash0

If you have Fluent Bit or similar log collection configured:

1. Router logs appear in Dash0 **Log Explorer**
2. Filter logs by:
   - `level: ERROR`
   - `message: "GraphQL error in request"`
   - `service.name: apollo-router`
3. Correlate with traces using `trace_id` and `span_id`

## Dash0's Intelligent Log Parsing

One of Dash0's key capabilities is automatic parsing and field extraction from unstructured logs. Here's what Dash0 does with the router's text-format logs:

### Automatic Field Extraction

Dash0 analyzes the unstructured log lines and automatically extracts:

1. **Timestamp Parsing** - Extracts ISO8601 timestamps for accurate log ordering and time-series analysis
2. **Severity Level Detection** - Identifies ERROR, WARN, INFO keywords and categories logs by severity
3. **Span Context Extraction** - Parses `span=[trace_id span_id]` patterns to correlate logs with traces
4. **Service Metadata** - Extracts `service_name=` values for service identification
5. **Thread Information** - Parses thread names for concurrency analysis
6. **Source Location** - Extracts filename and line numbers for code-level debugging

### Log Explorer Features

In Dash0's Log Explorer, you can:

- **Filter by log level:** `level:ERROR` to see only error logs
- **Search by message:** `"GraphQL error"` to find specific error types
- **Filter by service:** `service_name:apollo-router`
- **Time-range queries:** Find logs within specific time windows
- **Trace correlation:** Click a trace_id to view the complete trace
- **Pattern matching:** Search for common error messages across logs

### Observing Dash0's Intelligence

To see this in action:

1. Deploy the router with the new unstructured text format
2. Generate errors by running vegeta load tests
3. Go to Dash0's **Log Explorer**
4. Notice how the logs are automatically parsed and searchable:
   - You can search for `ERROR` without pre-defining fields
   - Trace IDs are clickable links to traces
   - Logs are sorted by timestamp and severity
   - Service names appear in faceted search

## Best Practices

1. **Error Rates:** Keep bad query rates low (~5-10%) to avoid overwhelming observability systems
2. **Error Monitoring:** Set up alerts for unexpected error rate spikes
3. **Error Investigation:** Use trace correlation (trace_id) to drill into specific errors
4. **Production:** Consider disabling or significantly reducing error injection in production
5. **Testing:** Use error event logs to validate error handling behavior in your application
6. **Log Format:** Unstructured logs allow Dash0 to demonstrate intelligent parsing - great for demos and testing observability features

## References

- Apollo Router Telemetry Configuration: `shared/router/router.yaml`
- Kubernetes Helm Values: `kubernetes/helm-values/router-values.yaml`
- Vegeta Load Testing: `kubernetes/base/vegeta.yaml`
- Error Injection System: `docs/ERROR_INJECTION.md`
