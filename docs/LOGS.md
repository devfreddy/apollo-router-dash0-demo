# Log Collection with Dash0 Operator

Logs from your Apollo Router and subgraphs are automatically collected and sent to Dash0 via the **Dash0 Kubernetes Operator**.

## Quick Start

### Kubernetes Deployment

```bash
# Deploy the full stack including Dash0 Operator with log collection enabled
./k8s/scripts/k3d-up.sh
```

The script will:
1. Create a k3d Kubernetes cluster
2. Install Dash0 Operator
3. Enable automatic log, metric, and trace collection
4. Deploy your Apollo Router and subgraphs

### Verify Logs Are Being Collected

```bash
# Check if Dash0 Operator is running
kubectl get deployment -n dash0-system dash0-operator-controller-manager

# Check if pods are instrumented
kubectl describe pod <pod-name> -n apollo-dash0-demo | grep -i "otel\|dash0"

# View logs in Dash0 UI
# Navigate to: https://app.dash0.com → Logs
# Filter by Service, Time Range, etc.
```

## How It Works

```
┌─────────────────────────────────────────────┐
│  Pod: apollo-router                         │
│  ├─ stdout: JSON logs                       │
│  └─ stderr: error logs                      │
└──────────────┬──────────────────────────────┘
               │
        Dash0 Operator
    (auto-injected instrumentation)
               │
        OTLP HTTP Export
               │
    https://ingress.us-west-2.aws.dash0.com
               │
         Dash0 Backend
               │
      ┌─────────────────────┐
      │  Logs Dataset       │
      │  (searchable)       │
      │  (with K8s metadata)│
      └─────────────────────┘
```

## What Gets Collected

✅ **Container Logs**
- stdout and stderr from all pods
- Structured JSON logs from applications

✅ **Kubernetes Metadata**
- Pod name and namespace
- Container name
- Pod labels and annotations
- Deployment/StatefulSet information

✅ **Additional Telemetry** (from Operator)
- Metrics: CPU, memory, latency
- Traces: Request spans and latency
- Infrastructure metrics: Node resource usage

## Viewing Logs in Dash0

1. Open https://app.dash0.com
2. Navigate to **Logs**
3. Filter by:
   - **Service**: apollo-router-demo, accounts-subgraph, etc.
   - **Dataset**: gtm-dash0
   - **Time Range**: Last 1 hour (or your preferred range)
4. Search for specific log messages or patterns

### Log Query Examples

- Find all ERROR logs: `level=ERROR`
- Find router request errors: `service="apollo-router-demo" AND level="ERROR"`
- Find latency issues: `duration > 500`
- Find GraphQL query failures: `message~="GraphQL" AND error=true`

## Configuration

Log collection is configured in `k8s/base/dash0-operator-config.yaml`:

```yaml
apiVersion: operator.dash0.com/v1alpha1
kind: Dash0OperatorConfiguration
metadata:
  name: dash0-operator-configuration
spec:
  export:
    http:
      endpoint: https://ingress.us-west-2.aws.dash0.com
      headers:
        - name: Authorization
          value: ${DASH0_AUTH_TOKEN}
        - name: Dash0-Dataset
          value: gtm-dash0
      encoding: proto

  logsCollection:
    enabled: true  # ← Logs collection enabled

  telemetryCollection:
    enabled: true  # Metrics and traces

  kubernetesInfrastructureMetricsCollection:
    enabled: true  # K8s node metrics
```

## Required Configuration

### Environment Variables (in `.env`)

```bash
DASH0_AUTH_TOKEN=auth_xxxxxxxxxxxxxxxx      # Your Dash0 API token
DASH0_REGION=us-west-2                      # Your region
DASH0_METRICS_ENDPOINT=https://...          # Metrics endpoint
DASH0_TRACES_ENDPOINT=https://...           # Traces endpoint
```

All values are provided in `.env.sample` - just fill in your `DASH0_AUTH_TOKEN`.

## Troubleshooting

### No Logs Appearing in Dash0

**1. Verify Operator is Running**
```bash
kubectl get pods -n dash0-system
# Should see: dash0-operator-controller-manager-xxxxx
```

**2. Check if Pods Are Instrumented**
```bash
kubectl describe pod <pod-name> -n apollo-dash0-demo | grep -i otel
# Should see OTEL-related environment variables
```

**3. Check Operator Configuration Applied**
```bash
kubectl get dash0operatorconfiguration
# Should show: dash0-operator-configuration
```

**4. View Operator Logs**
```bash
kubectl logs -f -n dash0-system -l app.kubernetes.io/name=dash0-operator
```

**5. Verify Token is Valid**
```bash
# Token should start with "auth_"
echo $DASH0_AUTH_TOKEN
# Should output: auth_xxxxxxxxxxxxxxxx
```

### Pods Not Being Instrumented

The Dash0 Operator instruments pods via admission webhooks. If this isn't working:

```bash
# Check admission webhook
kubectl get mutatingwebhookconfigurations | grep dash0

# Check operator is ready
kubectl rollout status deployment/dash0-operator-controller-manager -n dash0-system

# Restart operator (wait for new pods to instrument your workloads)
kubectl rollout restart deployment/dash0-operator-controller-manager -n dash0-system
```

### High Memory/CPU Usage from Operator

The Dash0 Operator uses OTLP exporters which can consume resources. Adjust if needed:

```bash
# Edit operator deployment to reduce resource requests
kubectl edit deployment dash0-operator-controller-manager -n dash0-system
```

## Performance Considerations

- **Operator overhead**: ~50-100MB RAM, minimal CPU
- **Log ingestion rate**: Limited by Dash0 plan (check dashboard for usage)
- **Network bandwidth**: Compressed OTLP protocol (~60-80% smaller than JSON)
- **Storage**: Depends on Dash0 retention policy

## Best Practices

1. **Use appropriate log levels in your applications**
   - DEBUG for development
   - INFO for production
   - ERROR/WARN for critical issues

2. **Structure your logs as JSON**
   - Easier to parse and search
   - Enables filtering on specific fields

3. **Include contextual information**
   - Request IDs (trace ID)
   - User information (when appropriate)
   - Operation details

4. **Monitor log volume**
   - Check Dash0 dashboard for ingestion rates
   - Adjust verbosity if needed to control costs

## Limits and Quotas

- **Log size**: Max 64KB per log entry
- **Batch size**: 100 logs per batch by default
- **Flush interval**: 1 second
- **Dataset**: Currently using "default" for all logs

To change dataset or flush settings, edit `k8s/base/dash0-operator-config.yaml`.

## Related Documentation

- [OPERATOR-INTEGRATION.md](OPERATOR-INTEGRATION.md) - Full Operator setup details
- [README.md](README.md) - Project overview
- [Dash0 Documentation](https://docs.dash0.com) - Dash0 features and concepts

## Support

If logs aren't appearing:

1. Check the troubleshooting section above
2. Verify `DASH0_AUTH_TOKEN` is set correctly
3. Ensure cluster has internet access to Dash0 endpoints
4. Check Operator logs for errors: `kubectl logs -n dash0-system -l app.kubernetes.io/name=dash0-operator`

---

**Next Steps**: View your logs in Dash0 at https://app.dash0.com → Logs → Filter by service and time range.
