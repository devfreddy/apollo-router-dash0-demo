# Unstructured Logs Demo - Dash0 Log Parsing Magic

This document explains why the router has been switched to unstructured text logging and what you'll observe when you deploy it.

## What Changed

The Apollo Router's logging format was changed from **JSON** to **unstructured text** in the Kubernetes Helm configuration.

### Before (JSON Format)
```json
{
  "timestamp": "2025-11-10T10:30:45.123Z",
  "level": "ERROR",
  "message": "GraphQL error in request",
  "trace_id": "xyz789uvw012",
  "span_id": "abc123def456"
}
```

### After (Text Format)
```
2025-11-10T10:30:45.123456Z ERROR apollo_router [apollo_router:165] thread_name="tokio-runtime-worker": GraphQL error in request span=[abc123def456 xyz789uvw012] service_name=apollo-router
```

## Why Unstructured Logs?

**To showcase Dash0's intelligent log parsing and field extraction capabilities.**

Dash0 excels at:
- Parsing free-form log text without pre-defined schemas
- Automatically extracting structured fields from unstructured lines
- Making unstructured logs fully searchable and filterable
- Correlating logs with traces and metrics using context clues

## Configuration Details

### File Changed
`kubernetes/helm-values/router-values.yaml`

### Section
```yaml
telemetry:
  exporters:
    logging:
      stdout:
        enabled: true
        format:
          text:  # Changed from 'json' to 'text'
            display_filename: true
            display_level: true
            display_line_number: true
            display_target: true
            display_thread_name: true
            display_timestamp: true
            display_current_span: true
            display_resource: true
            display_trace_id: true
            display_span_id: true
```

### Display Options

- **filename** - Source code filename for debugging
- **line_number** - Exact line in source code where log was emitted
- **target** - Rust module path (apollo_router, apollo_gateway_core, etc.)
- **thread_name** - Tokio runtime worker or thread name
- **timestamp** - ISO8601 format with nanosecond precision
- **level** - Log level (ERROR, WARN, INFO, DEBUG, TRACE)
- **current_span** - OpenTelemetry span context
- **trace_id** - Correlation with distributed traces
- **span_id** - Specific span identification
- **resource** - Service metadata (service.name, environment, etc.)

## What You'll See

### In kubectl logs

```bash
$ kubectl logs -f deployment/apollo-router -n apollo-dash0-demo

2025-11-10T10:30:45.234567Z  WARN apollo_router [apollo_router/src/router.rs:245] thread_name="tokio-runtime-worker-2": Timeout waiting for subgraph response span=[a1b2c3d4e5f6 9z8y7x6w5v4u] service_name=apollo-router deployment.environment=demo

2025-11-10T10:30:46.123456Z ERROR apollo_router [apollo_router/src/query_planner.rs:512] thread_name="tokio-runtime-worker-1": GraphQL error in request span=[9z8y7x6w5v4u a1b2c3d4e5f6] service_name=apollo-router error.message="Cannot query field 'invalidField' on type 'User'"

2025-11-10T10:30:47.987654Z  INFO apollo_router [apollo_router/src/router.rs:100] thread_name="tokio-runtime-worker-3": Processing supergraph request span=[x1y2z3a4b5c6 d7e8f9g0h1i2] service_name=apollo-router operation_name=GetProducts
```

### In Dash0 Log Explorer

Dash0 automatically parses these lines and makes them searchable by:

**Search for errors:**
```
level:ERROR service_name:apollo-router
```

**Find specific error types:**
```
message:"GraphQL error" operation_name:BadInvalidField
```

**Correlate with traces:**
```
trace_id:a1b2c3d4e5f6
```

**Timeline view:**
- Logs are automatically sorted by timestamp
- Error spikes appear as patterns in the log timeline
- Severity is color-coded (red for ERROR, yellow for WARN)

**Service-level dashboard:**
- All logs from apollo-router are grouped together
- Thread information shows concurrency patterns
- Source code location helps identify which code path logged the message

## How Dash0 Parses Unstructured Logs

### 1. Timestamp Extraction
Dash0 recognizes ISO8601 timestamps and uses them for chronological ordering and time-range queries.

### 2. Level Detection
Common log level keywords are identified:
- `ERROR` → severity = error
- `WARN` → severity = warning
- `INFO` → severity = info
- `DEBUG` → severity = debug
- `TRACE` → severity = trace

### 3. Key-Value Pair Extraction
Dash0 recognizes patterns like:
- `key=value` → extracted as field
- `key="value with spaces"` → properly parsed
- `span=[uuid1 uuid2]` → extracted as trace context

### 4. Message Content
The primary message is extracted as the log content, making full-text search possible.

### 5. Context Correlation
- **Trace IDs** are automatically linked to traces
- **Span IDs** are correlated with specific spans
- **Service names** group logs by service
- **Thread names** identify concurrency patterns

## Benefits of Unstructured Format

| Aspect | Unstructured | JSON |
|--------|--------------|------|
| **File Size** | Smaller (human-readable) | Larger (verbose metadata) |
| **Parsing Speed** | Intelligent extraction | Direct field lookup |
| **Extensibility** | Easy to add new fields | Requires schema changes |
| **Demo Value** | Shows Dash0's power | Already parsed |
| **Human Readability** | Easy to scan logs | Hard to read raw output |
| **Field Flexibility** | Automatic field detection | Pre-defined schema |

## Testing the Demo

### 1. Deploy with New Format
```bash
./kubernetes/scripts/update-configmap.sh
./kubernetes/scripts/redeploy-router.sh
```

### 2. Watch Raw Logs
```bash
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo
```

You'll see unstructured text logs flowing in real-time.

### 3. Trigger Errors
In another terminal, check vegeta is running:
```bash
kubectl logs -f deployment/vegeta -n apollo-dash0-demo
```

### 4. Explore in Dash0
1. Open Dash0 Console
2. Navigate to **Logs** → **Log Explorer**
3. Search for `level:ERROR` or `service_name:apollo-router`
4. Notice how Dash0 automatically:
   - Extracts fields from the free-form text
   - Makes logs searchable without pre-processing
   - Correlates with traces using trace IDs
   - Displays thread and code location information

## Reverting to JSON Format

If you want to go back to JSON format:

```yaml
# In kubernetes/helm-values/router-values.yaml
telemetry:
  exporters:
    logging:
      stdout:
        format:
          json:  # Change from 'text' to 'json'
            # ... existing JSON format options ...
```

Then redeploy:
```bash
./kubernetes/scripts/update-configmap.sh
./kubernetes/scripts/redeploy-router.sh
```

## References

- **Detailed Configuration:** [ERROR_EVENT_LOGS.md](./ERROR_EVENT_LOGS.md)
- **Apollo Router Telemetry Docs:** [Apollo Router Official Docs](https://www.apollographql.com/docs/router/configuration/telemetry/)
- **OpenTelemetry Logging:** [OpenTelemetry Logs Specification](https://opentelemetry.io/docs/specs/otel/logs/)
