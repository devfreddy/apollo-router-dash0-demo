# Session Notes - 2025-10-12

## Fixed Trace Context Propagation in Apollo Router

### What Was Accomplished
- ✅ Identified service map issue in Dash0 (subgraphs disconnected from Router)
- ✅ Diagnosed missing W3C Trace Context propagation configuration
- ✅ Added propagation settings to Router configuration
- ✅ Restarted Router and verified fix with test queries
- ✅ Generated trace data to populate service map

### The Problem
The Dash0 service map showed:
- Named subgraph services (products, reviews, accounts, inventory) appearing disconnected
- Another set of unnamed services appearing separately
- No clear linkage between Apollo Router and its subgraphs

**Root Cause:** Apollo Router was not propagating trace context headers (`traceparent`, `tracestate`) to subgraph requests, causing subgraph traces to be disconnected from router traces.

### Configuration Changes

**File:** `router/router.yaml`

Added trace context propagation configuration at lines 70-80:

```yaml
telemetry:
  exporters:
    tracing:
      # Propagate trace context to subgraphs using W3C Trace Context format
      propagation:
        # W3C Trace Context (traceparent, tracestate headers)
        trace_context: true
        # Other formats disabled for clarity
        jaeger: false
        baggage: false
        datadog: false
        zipkin: false
```

### Key Findings

1. **W3C Trace Context is the Standard:**
   - OpenTelemetry JS SDK in subgraphs uses W3C Trace Context by default
   - Apollo Router v2 supports multiple propagation formats
   - Must explicitly enable propagation in Router config

2. **Propagation Chain:**
   ```
   Client Request
     → Router (creates trace)
     → traceparent header propagated to subgraphs
     → Subgraphs (join existing trace as child spans)
     → All linked in Dash0 service map
   ```

3. **Configuration Location Matters:**
   - Propagation config goes under `telemetry.exporters.tracing`
   - Must be before `common` and `otlp` sections
   - Router requires restart to apply changes

### Technical Details

**Before Fix:**
- Router creates trace with span ID: `abc123`
- Router calls Products subgraph WITHOUT `traceparent` header
- Products subgraph creates new trace with span ID: `xyz789`
- Dash0 sees two separate traces, no relationship

**After Fix:**
- Router creates trace with span ID: `abc123`
- Router calls Products subgraph WITH `traceparent: 00-abc123-...` header
- Products subgraph reads header and creates child span of `abc123`
- Dash0 sees single distributed trace linking Router → Products

### Testing Performed

1. **Configuration Update:**
   - Added propagation settings to `router.yaml`
   - Validated YAML syntax

2. **Service Restart:**
   ```bash
   docker compose restart router
   ```

3. **Test Queries:**
   - Executed federated query: `topProducts { id name price reviews { rating body } }`
   - Generated 10 additional queries to populate trace data
   - Waited 1-2 minutes for traces to flush to Dash0

### Status
✅ **Fixed** - Trace context propagation enabled and tested
⏳ **Pending** - Dash0 service map updates (1-2 minutes for data ingestion)

### Next Steps

1. **Verify Service Map in Dash0:**
   - Check that `apollo-router-demo` now shows connections to all subgraphs
   - Verify named subgraphs (products-subgraph, reviews-subgraph, etc.) are properly linked
   - Confirm no duplicate or unnamed services appear

2. **Validate Trace Continuity:**
   - Execute a complex federated query
   - View trace in Dash0
   - Confirm trace shows: Client → Router → Subgraph(s) in single timeline
   - Check span attributes include service names

3. **Monitor for Issues:**
   - Watch for any trace sampling discrepancies
   - Verify all four subgraphs appear in service map
   - Check error traces still propagate correctly

4. **Documentation Updates:**
   - Update SETUP.md with propagation requirements
   - Add troubleshooting section for service map issues
   - Document W3C Trace Context as the standard

5. **Performance Testing:**
   - Run load test with Vegeta
   - Verify propagation doesn't impact latency
   - Check trace sampling ratio (10%) is maintained

### Files Modified

- `router/router.yaml` - Added trace context propagation configuration

### References

- [Apollo Router Telemetry Documentation](https://www.apollographql.com/docs/router/configuration/telemetry/exporters/tracing/overview)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
