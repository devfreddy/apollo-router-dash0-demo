# Dash0 Kubernetes Operator Integration Summary

## Overview

The Apollo Router + Dash0 demo now includes the **Dash0 Kubernetes Operator** for automatic instrumentation and enhanced observability in the k3d deployment.

## What Changed

### Before: Manual OTLP Export

- Apollo Router exported metrics/traces directly to Dash0 via OTLP
- Subgraphs had no instrumentation or telemetry
- No pod log collection
- No Kubernetes infrastructure metrics

### After: Operator-Based Observability

- **Apollo Router**: Still exports directly via OTLP + Prometheus metrics scraped by operator
- **Subgraphs**: Automatically instrumented with Dash0 Node.js SDK (zero code changes!)
- **Pod Logs**: Automatically collected and forwarded to Dash0
- **Kubernetes Metrics**: Cluster, node, and pod metrics collected
- **Unified Telemetry**: All services send telemetry through OpenTelemetry Collector

## Key Benefits

### 1. Zero-Code Instrumentation

**Node.js subgraphs are automatically instrumented:**
- ✅ No code changes required
- ✅ No manual SDK installation
- ✅ Automatic spans, metrics, and logs
- ✅ Context propagation between services

### 2. Complete Observability Stack

**All signals collected:**
- ✅ **Traces**: Distributed tracing across all services
- ✅ **Metrics**: Application + infrastructure metrics
- ✅ **Logs**: Pod logs from all containers
- ✅ **K8s Metrics**: Cluster health and resource usage

### 3. Operational Excellence

**Better insights:**
- ✅ Service map shows all dependencies
- ✅ Full request flow visibility (router → subgraphs)
- ✅ Correlate logs with traces
- ✅ Infrastructure health monitoring

## Architecture

### Components Deployed

**dash0-system namespace:**
1. **Operator Controller** (1 pod)
   - Manages workload instrumentation
   - Watches for new/updated deployments
   - Injects OpenTelemetry SDK into Node.js containers

2. **OTel Collector DaemonSet** (1 pod per node)
   - Collects telemetry from all pods on the node
   - Scrapes Prometheus endpoints
   - Collects pod logs
   - Exports to Dash0 backend

3. **Cluster Metrics Collector** (1 pod)
   - Collects cluster-level metrics
   - Monitors node and pod health

**apollo-dash0-demo namespace:**
- All workloads automatically instrumented via `dash0-instrumentation` volume
- Node.js apps have Dash0 SDK injected via init container
- Apollo Router metrics scraped via Prometheus annotation

### Telemetry Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Apollo Router                                               │
│   ├─[Direct OTLP]───────────────────────────► Dash0 Cloud  │
│   └─[Prometheus /metrics]──► OTel Collector ► Dash0 Cloud  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Subgraphs (accounts, products, reviews, inventory)         │
│   └─[Auto-instrumented]──────► OTel Collector ► Dash0 Cloud│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Pod Logs (all containers)                                   │
│   └─[Collected]──────────────► OTel Collector ► Dash0 Cloud│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Kubernetes Metrics (cluster, nodes, pods)                   │
│   └─[Collected]────────────► Cluster Collector ► Dash0 Cloud│
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Workload Instrumentation

When a pod is created/updated in a monitored namespace:

1. Operator watches for Deployment/StatefulSet/DaemonSet changes
2. Detects Node.js workloads (via `node` in container image)
3. Injects init container that copies Dash0 SDK
4. Adds volume mount for SDK files
5. Sets `NODE_OPTIONS` to load Dash0 SDK
6. Pod starts with automatic instrumentation

**Example (accounts subgraph):**
```yaml
# Before instrumentation
spec:
  containers:
  - name: accounts
    image: apollo-dash0-demo-accounts:latest

# After instrumentation (automatic)
spec:
  initContainers:
  - name: dash0-init-container
    image: ghcr.io/dash0hq/instrumentation:...
    volumeMounts:
    - name: dash0-instrumentation
      mountPath: /opt/dash0
  containers:
  - name: accounts
    image: apollo-dash0-demo-accounts:latest
    env:
    - name: NODE_OPTIONS
      value: --require /opt/dash0/instrumentation/node.js/node_modules/@dash0hq/opentelemetry/src/index.js
    volumeMounts:
    - name: dash0-instrumentation
      mountPath: /opt/dash0
  volumes:
  - name: dash0-instrumentation
    emptyDir: {}
```

### 2. Log Collection

- OTel Collector DaemonSet reads pod logs via Kubernetes API
- Logs are enriched with pod metadata (namespace, pod name, labels)
- Forwarded to Dash0 with correlation to traces (via trace IDs in logs)

### 3. Prometheus Scraping

- Collector watches for pods with `prometheus.io/scrape: "true"` annotation
- Scrapes metrics from `prometheus.io/port` and `prometheus.io/path`
- Converts to OTLP and sends to Dash0
- Apollo Router metrics automatically scraped

## Configuration

### Operator Settings

**Helm values**: `k8s/helm-values/dash0-operator-values.yaml`

Key settings:
```yaml
operator:
  dash0Export:
    enabled: true
    endpoint: "ingress.us-west-2.aws.dash0.com:4317"
    secretRef:
      name: "dash0-auth"
      key: "token"

  instrumentation:
    delayAfterEachWorkloadMillis: 100

  collectKubernetesInfrastructureMetrics: true
  collectPodLabelsAndAnnotations: true
```

### Monitoring Resource

**Manifest**: `k8s/base/dash0-monitoring.yaml`

Key settings:
```yaml
spec:
  instrumentWorkloads:
    mode: all  # Instrument existing + new + updated workloads
    labelSelector: "dash0.com/enable!=false"  # Opt-out model

  logCollection:
    enabled: true

  prometheusScraping:
    enabled: true
```

## Verification

### Check Operator Status

```bash
# Operator pods
kubectl get pods -n dash0-system

# Instrumented workloads
kubectl get pods -n apollo-dash0-demo -o custom-columns=NAME:.metadata.name,ANNOTATIONS:.metadata.annotations | grep dash0

# Monitoring resource
kubectl get dash0monitoring -n apollo-dash0-demo
kubectl describe dash0monitoring dash0-monitoring-resource -n apollo-dash0-demo
```

### Test Telemetry

```bash
# Generate traffic
curl -X POST http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ topProducts { id name price reviews { rating body author { username } } } }"}'

# Check Dash0 dashboard for:
# - Service map showing router → subgraphs
# - Traces spanning all services
# - Logs from all pods
# - Kubernetes metrics
```

## Deployment

### Automated via k3d-up.sh

The operator is automatically installed when you deploy with k3d:

```bash
./k8s/scripts/k3d-up.sh
```

The script:
1. Creates `dash0-system` namespace
2. Creates Dash0 auth secret
3. Installs operator via Helm
4. Waits for operator to be ready
5. Deploys subgraphs and router
6. Applies Dash0Monitoring resource
7. Operator automatically instruments workloads

### Manual Deployment

If deploying manually:

```bash
# 1. Create namespace
kubectl create namespace dash0-system

# 2. Create auth secret
kubectl create secret generic dash0-auth \
  --from-literal=token="$DASH0_AUTH_TOKEN" \
  --namespace=dash0-system

# 3. Install operator
helm repo add dash0-operator https://dash0hq.github.io/dash0-operator
helm repo update

helm install dash0-operator dash0-operator/dash0-operator \
  --namespace dash0-system \
  --set operator.dash0Export.enabled=true \
  --set operator.dash0Export.endpoint="ingress.us-west-2.aws.dash0.com:4317" \
  --set operator.dash0Export.secretRef.name="dash0-auth" \
  --set operator.dash0Export.secretRef.key="token"

# 4. Deploy monitoring resource
kubectl apply -f k8s/base/dash0-monitoring.yaml
```

## Opt-Out Options

### Per-Workload Opt-Out

Add label to prevent instrumentation:

```bash
kubectl label deployment accounts dash0.com/enable=false -n apollo-dash0-demo
```

Or in deployment manifest:
```yaml
metadata:
  labels:
    dash0.com/enable: "false"
```

### Disable Instrumentation

Change mode to `none`:

```bash
kubectl patch dash0monitoring dash0-monitoring-resource -n apollo-dash0-demo \
  --type merge -p '{"spec":{"instrumentWorkloads":{"mode":"none"}}}'
```

## Resource Usage

**Additional overhead from operator:**
- Controller: ~100 MB RAM, ~0.1 CPU
- Collector per node: ~200 MB RAM, ~0.2 CPU
- Cluster metrics: ~50 MB RAM, ~0.05 CPU

**Total for 2-node k3d cluster: ~650 MB RAM, ~0.65 CPU**

## Documentation

- **Full operator docs**: [k8s/DASH0-OPERATOR.md](k8s/DASH0-OPERATOR.md)
- **k8s deployment**: [k8s/README.md](k8s/README.md)
- **Dash0 docs**: https://www.dash0.com/documentation/dash0/dash0-kubernetes-operator

## What's in Dash0 Now

With the operator, you'll see in Dash0:

1. **Service Map**
   - All 5 services (router + 4 subgraphs)
   - Request flow visualization
   - Dependency relationships

2. **Traces**
   - End-to-end distributed traces
   - Router → Products → Reviews → Accounts flow
   - Context propagation working

3. **Metrics**
   - Router: HTTP metrics, query planning, cache hits
   - Subgraphs: Request rates, latencies, errors
   - Kubernetes: CPU, memory, network

4. **Logs**
   - All pod logs with trace correlation
   - Searchable by service, pod, or trace ID

5. **Infrastructure**
   - Cluster health
   - Node resources
   - Pod status

## Next Steps

1. **Generate Load**: Start Vegeta load testing to see operator in action
2. **Explore Dash0**: View service map, traces, and logs
3. **Add Dashboards**: Create Perses dashboards as Kubernetes CRDs
4. **Set Alerts**: Define PrometheusRule resources for alerting
5. **Tune Sampling**: Adjust trace sampling rates if needed

## Summary

The Dash0 Kubernetes Operator transforms the demo from "manually instrumented router only" to "fully automatic observability for all services" with zero code changes. This provides a production-ready observability stack that mirrors what you'd deploy in a real Kubernetes environment.

**Key Achievement**: Complete observability for a federated GraphQL architecture with automatic instrumentation, no code changes, and minimal operational overhead. 🎉
