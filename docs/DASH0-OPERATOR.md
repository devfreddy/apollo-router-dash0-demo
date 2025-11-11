# Dash0 Kubernetes Operator Integration

This document describes the Dash0 Kubernetes operator integration in the k3d deployment.

## Overview

The Dash0 Kubernetes operator provides automatic instrumentation and enhanced observability for your Kubernetes cluster. It:

- **Automatically instruments** Node.js applications (including our subgraphs)
- **Collects pod logs** and forwards them to Dash0
- **Scrapes Prometheus metrics** from annotated pods (like Apollo Router)
- **Collects Kubernetes infrastructure metrics** (cluster, nodes, pods)
- **Manages Dash0 resources** (dashboards, check rules, synthetic checks)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster (k3d)                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          Namespace: dash0-system                      │ │
│  │                                                       │ │
│  │  ┌────────────────────────────────────┐              │ │
│  │  │  Dash0 Operator Controller         │              │ │
│  │  │  - Watches workloads               │              │ │
│  │  │  - Injects instrumentation         │              │ │
│  │  │  - Manages Dash0 resources         │              │ │
│  │  └────────────────────────────────────┘              │ │
│  │                                                       │ │
│  │  ┌────────────────────────────────────┐              │ │
│  │  │  OpenTelemetry Collector (DaemonSet)│              │ │
│  │  │  - Collects telemetry from pods    │              │ │
│  │  │  - Exports to Dash0 backend        │              │ │
│  │  └────────────────────────────────────┘              │ │
│  │                                                       │ │
│  │  ┌────────────────────────────────────┐              │ │
│  │  │  Cluster Metrics Collector         │              │ │
│  │  │  - Collects K8s infrastructure     │              │ │
│  │  └────────────────────────────────────┘              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │       Namespace: apollo-dash0-demo                    │ │
│  │                                                       │ │
│  │  ┌────────────────┐  ┌────────────────┐              │ │
│  │  │ Instrumented   │  │ Instrumented   │              │ │
│  │  │ Apollo Router  │  │ Subgraphs      │              │ │
│  │  │ (Prometheus)   │  │ (Node.js auto) │              │ │
│  │  └────────────────┘  └────────────────┘              │ │
│  │         │                     │                       │ │
│  │         └─────────┬───────────┘                       │ │
│  │                   ▼                                   │ │
│  │     ┌──────────────────────────┐                     │ │
│  │     │ OTel Collector Agent     │                     │ │
│  │     └──────────────────────────┘                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                          │                                  │
│                          ▼                                  │
│                    Dash0 Backend                            │
│                 (ingress.us-west-2.aws.dash0.com:4317)     │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Dash0 Operator Controller

**Deployment**: `dash0-operator-controller`
**Namespace**: `dash0-system`

Responsibilities:
- Watches for Dash0Monitoring resources
- Automatically instruments workloads (Deployments, StatefulSets, DaemonSets)
- Injects OpenTelemetry SDKs into Node.js containers
- Manages workload lifecycle (restart pods when needed for instrumentation)

### 2. OpenTelemetry Collector Agent (DaemonSet)

**DaemonSet**: `dash0-operator-opentelemetry-collector-agent-daemonset`
**Namespace**: `dash0-system`

Responsibilities:
- Runs on every node in the cluster
- Collects telemetry from all pods on the node
- Collects pod logs
- Scrapes Prometheus endpoints
- Exports all telemetry to Dash0 backend

### 3. Cluster Metrics Collector

**Deployment**: `dash0-operator-cluster-metrics-collector-deployment`
**Namespace**: `dash0-system`

Responsibilities:
- Collects cluster-level metrics
- Monitors node health and resource usage
- Tracks pod and container metrics

## Configuration

### Operator Configuration

The operator is configured using a `Dash0OperatorConfiguration` resource with **HTTP export** (recommended):

**File**: `kubernetes/base/dash0-operator-config.yaml`

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
          value: Bearer ${DASH0_AUTH_TOKEN}
      encoding: proto

  kubernetesInfrastructureMetricsCollection:
    enabled: true

  telemetryCollection:
    enabled: true

  selfMonitoring:
    enabled: true

  collectPodLabelsAndAnnotations:
    enabled: true
```

**Why HTTP instead of gRPC?**

The operator supports three export types:
- `dash0` - Uses gRPC (port 4317) with built-in authorization
- `grpc` - Generic gRPC export
- `http` - HTTP export (port 443/4318)

We use HTTP export because:
1. ✅ Better compatibility - some auth tokens may be blocked on the gRPC endpoint
2. ✅ More reliable - HTTP endpoints have fewer firewall/proxy issues
3. ✅ Same functionality - both protocols support the full OTLP spec
4. ✅ Simpler debugging - easier to inspect HTTP traffic

The Helm chart is installed with minimal settings (instrumentation configuration only):

```yaml
operator:
  instrumentation:
    delayAfterEachWorkloadMillis: 100
    delayAfterEachNamespaceMillis: 100

  collectKubernetesInfrastructureMetrics: true
  collectPodLabelsAndAnnotations: true
```

The `Dash0OperatorConfiguration` resource is created separately via the k3d-up.sh script.

### Monitoring Resource

Each namespace that needs monitoring requires a Dash0Monitoring resource:

**File**: `kubernetes/base/dash0-monitoring.yaml`

```yaml
apiVersion: operator.dash0.com/v1beta1
kind: Dash0Monitoring
metadata:
  name: dash0-monitoring-resource
  namespace: apollo-dash0-demo
spec:
  instrumentWorkloads:
    mode: all  # all, created-and-updated, or none
    labelSelector: "dash0.com/enable!=false"

  logCollection:
    enabled: true

  prometheusScraping:
    enabled: true

  synchronizePersesDashboards: true
  synchronizePrometheusRules: true
```

## Instrumentation Modes

### Mode: all (default)

Instruments:
- ✅ Existing workloads when Dash0Monitoring is created
- ✅ Existing workloads when operator restarts
- ✅ New workloads when deployed
- ✅ Updated workloads when changed

**Note**: Will restart pods to inject instrumentation

### Mode: created-and-updated

Instruments:
- ❌ Existing workloads
- ✅ New workloads when deployed
- ✅ Updated workloads when changed

**Use case**: Avoid pod restarts

### Mode: none

Instruments:
- ❌ No automatic instrumentation

**Use case**: Manual instrumentation only

## Opting Out of Instrumentation

### Per-Workload Opt-Out

Add label to prevent instrumentation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    dash0.com/enable: "false"  # This workload won't be instrumented
spec:
  # ... deployment spec
```

### Custom Label Selector

Use custom criteria for instrumentation:

```yaml
spec:
  instrumentWorkloads:
    mode: all
    labelSelector: "auto-instrument=true"  # Only instrument workloads with this label
```

## What Gets Instrumented

### Automatically Instrumented

1. **Node.js Applications** (our subgraphs):
   - Dash0 Node.js OpenTelemetry distribution injected
   - Automatic tracing, metrics, logs
   - Zero code changes required

2. **Prometheus-Annotated Services** (Apollo Router):
   - Metrics scraped from `prometheus.io/scrape: "true"` annotation
   - Port and path from annotations
   - Forwarded to Dash0

### Not Automatically Instrumented

- Apollo Router (Rust) - Already has native OTLP export
- Java applications (would need OpenTelemetry Java agent)
- Other languages - require manual instrumentation

## Verification

### Check Operator Status

```bash
# Check operator pods
kubectl get pods -n dash0-system

# Check operator logs
kubectl logs -f deployment/dash0-operator-controller -n dash0-system

# Check collector logs
kubectl logs -f daemonset/dash0-operator-opentelemetry-collector-agent-daemonset -n dash0-system
```

### Check Monitoring Status

```bash
# Check Dash0Monitoring resource
kubectl get dash0monitoring -n apollo-dash0-demo

# Get detailed status
kubectl describe dash0monitoring dash0-monitoring-resource -n apollo-dash0-demo

# Check which pods are instrumented
kubectl get pods -n apollo-dash0-demo -o custom-columns=NAME:.metadata.name,ANNOTATIONS:.metadata.annotations | grep dash0
```

### Verify Instrumentation

Look for these indicators:

1. **Pod Annotations**: `cluster-autoscaler.kubernetes.io/safe-to-evict-local-volumes:dash0-instrumentation`
2. **Init Containers**: `dash0-init-container` for Node.js apps
3. **Volume Mounts**: `dash0-instrumentation` volume
4. **Environment Variables**: `NODE_OPTIONS` pointing to Dash0 SDK

Example:
```bash
kubectl describe pod accounts-xxx -n apollo-dash0-demo | grep -A 5 "dash0"
```

## Telemetry Flow

### Node.js Subgraphs

```
Node.js App (accounts/products/reviews/inventory)
    ↓ (Dash0 SDK injected via init container)
OpenTelemetry SDK → Spans, Metrics, Logs
    ↓ (OTLP export to local collector)
OTel Collector Agent (DaemonSet on same node)
    ↓ (Forward to Dash0)
Dash0 Backend (ingress.us-west-2.aws.dash0.com:4317)
```

### Apollo Router

```
Apollo Router
    ↓ (Native OTLP export via router.yaml config)
Dash0 Backend (direct)
    AND
    ↓ (Prometheus /metrics endpoint)
OTel Collector Agent (scrapes via annotation)
    ↓ (Forward to Dash0)
Dash0 Backend
```

### Pod Logs

```
All Pods in apollo-dash0-demo namespace
    ↓ (Kubernetes logs)
OTel Collector Agent (DaemonSet)
    ↓ (Collect and forward)
Dash0 Backend
```

## Benefits of the Operator

### Compared to Manual Instrumentation

**Without Operator**:
- ❌ Manual SDK installation in each subgraph
- ❌ Code changes required
- ❌ Managing OTLP exporters
- ❌ Configuring log forwarding
- ❌ Setting up Prometheus scraping

**With Operator**:
- ✅ Zero code changes
- ✅ Automatic instrumentation
- ✅ Centralized configuration
- ✅ Automatic log collection
- ✅ Automatic Prometheus scraping
- ✅ Cluster-wide visibility

### Additional Features

1. **Dashboard Synchronization**: Manage Perses dashboards as Kubernetes resources
2. **Check Rules**: Define Prometheus alerting rules and sync to Dash0
3. **Synthetic Checks**: Create synthetic monitoring checks via CRDs
4. **Views**: Organize telemetry into custom views

## Troubleshooting

### Pods Not Instrumented

1. Check Dash0Monitoring resource:
   ```bash
   kubectl describe dash0monitoring -n apollo-dash0-demo
   ```

2. Check operator logs for errors:
   ```bash
   kubectl logs -f deployment/dash0-operator-controller -n dash0-system -c manager
   ```

3. Verify label selector matches your workloads:
   ```bash
   kubectl get pods -n apollo-dash0-demo --show-labels
   ```

### No Telemetry in Dash0

1. Check collector logs:
   ```bash
   kubectl logs -f daemonset/dash0-operator-opentelemetry-collector-agent-daemonset -n dash0-system -c opentelemetry-collector
   ```

2. Verify auth token is correct:
   ```bash
   kubectl get secret dash0-auth -n dash0-system -o jsonpath='{.data.token}' | base64 -d
   ```

3. Check network connectivity to Dash0:
   ```bash
   kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
     curl -v https://api.us-west-2.aws.dash0.com
   ```

### Instrumentation Causing Issues

Temporarily disable for specific workload:
```bash
kubectl label deployment accounts dash0.com/enable=false -n apollo-dash0-demo
```

Or disable operator-wide:
```bash
kubectl patch dash0monitoring dash0-monitoring-resource -n apollo-dash0-demo \
  --type merge -p '{"spec":{"instrumentWorkloads":{"mode":"none"}}}'
```

## Resource Usage

The operator adds minimal overhead:

- **Controller**: ~100 MB RAM, ~0.1 CPU
- **Collector (per node)**: ~200 MB RAM, ~0.2 CPU
- **Cluster Metrics**: ~50 MB RAM, ~0.05 CPU

Total for a 2-node cluster: ~650 MB RAM, ~0.65 CPU

## Next Steps

1. **Add More Namespaces**: Create Dash0Monitoring resources for other namespaces
2. **Custom Dashboards**: Create Perses dashboards as Kubernetes CRDs
3. **Alert Rules**: Define PrometheusRule resources for alerting
4. **Synthetic Checks**: Add Dash0SyntheticCheck resources for uptime monitoring
5. **Fine-tune Filtering**: Add filters/transforms in Dash0Monitoring spec

## References

- [Dash0 Operator Documentation](https://www.dash0.com/documentation/dash0/dash0-kubernetes-operator)
- [Dash0 Operator GitHub](https://github.com/dash0hq/dash0-operator)
- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/)
