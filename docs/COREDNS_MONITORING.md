# CoreDNS Monitoring with Dash0

This guide explains how to monitor CoreDNS (the DNS server running in your k3d cluster) and send telemetry to Dash0.

## Overview

CoreDNS is the DNS server used by Kubernetes (and k3d) to provide service discovery and DNS resolution. By monitoring CoreDNS, you can track:

- DNS query rates and latency
- Cache hit/miss ratios
- Error rates and response codes
- Service discovery performance

## Prerequisites

- Dash0 instance with DASH0_DATASET configured
- k3d cluster running (with CoreDNS enabled, which is default)
- Prometheus scraping enabled in Dash0 operator

## Architecture

```
k3d Cluster
├── kube-system namespace
│   └── coredns (deployment)
│       └── Exposes metrics on port 9053
│
└── apollo-dash0-demo namespace
    ├── Dash0 Monitoring (operator)
    │   └── Scrapes coredns-metrics service
    └── coredns-metrics (service)
        └── Expose port 9053 from kube-system
```

## Enabling CoreDNS Metrics

### Step 1: Check if CoreDNS is Exposing Metrics

First, verify CoreDNS is running:

```bash
kubectl get deployments -n kube-system | grep coredns
```

Check if the Prometheus plugin is enabled:

```bash
kubectl get configmap coredns -n kube-system -o yaml
```

Look for a `prometheus` line in the Corefile section. k3d comes with this **pre-enabled on port 9153**.

### Step 2: Verify Metrics Endpoint

Port-forward to CoreDNS to verify metrics are accessible:

```bash
kubectl port-forward -n kube-system deployment/coredns 9153:9153 &
curl http://localhost:9153/metrics
kill %1  # Kill the port-forward job
```

You should see Prometheus metrics output starting with `# HELP coredns_dns_requests_total`.

**Note:** If CoreDNS doesn't have the Prometheus plugin enabled (rare), you can patch it:

```bash
kubectl patch configmap coredns -n kube-system --type='json' \
  -p='[{"op": "replace", "path": "/data/Corefile", "value":".:53 {\n    errors\n    health\n    ready\n    kubernetes cluster.local in-addr.arpa ip6.arpa {\n      pods insecure\n      fallthrough in-addr.arpa ip6.arpa\n      ttl 30\n    }\n    prometheus :9153\n    forward . /etc/resolv.conf\n    cache 30\n    loop\n    reload\n    loadbalance\n}"}]'
```

Then restart CoreDNS:

```bash
kubectl rollout restart deployment/coredns -n kube-system
```

## Deployment

### Step 1: Deploy CoreDNS Monitoring

The monitoring configuration is automatically applied when you deploy:

```bash
./kubernetes/start.sh
```

This creates:
- `coredns-metrics` Service in `kube-system` namespace (exposes port 9053)
- ServiceMonitor for advanced Prometheus scraping (optional)
- ConfigMap with reference documentation

### Step 2: Verify Deployment

```bash
kubectl get service -n kube-system | grep coredns
kubectl get endpoints -n kube-system coredns-metrics
```

Should show:
```
NAME              TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
coredns-metrics   ClusterIP   10.43.X.X       <none>        9153/TCP
```

### Step 3: Check Dash0 Operator Scraping

The Dash0 operator (with `prometheusScraping: enabled`) will automatically discover and scrape the metrics from the `coredns-metrics` service.

Verify scraping is happening:

```bash
kubectl logs -n dash0-operator deployment/dash0-operator | grep coredns
```

## Key CoreDNS Metrics

### Query Performance

| Metric | Description | Use Case |
|--------|-------------|----------|
| `coredns_dns_requests_total` | Total DNS queries | Track query volume |
| `coredns_dns_request_duration_seconds` | Query latency | Identify slow DNS |
| `coredns_dns_responses_total` | Total DNS responses | Success rate analysis |

**Labels:**
- `zone`: DNS zone (e.g., `cluster.local`)
- `type`: Query type (A, AAAA, MX, SRV, etc.)
- `rcode`: Response code (NOERROR, NXDOMAIN, SERVFAIL, etc.)

### Cache Performance

| Metric | Description |
|--------|-------------|
| `coredns_cache_hits_total` | Successful cache hits |
| `coredns_cache_misses_total` | Cache misses requiring upstream lookup |

**Analysis:**
- Cache hit ratio = hits / (hits + misses)
- High miss ratio might indicate cache size issues

### Error Tracking

| Metric | Description |
|--------|-------------|
| `coredns_panic_count_total` | Errors/panics in CoreDNS |
| Requests with `rcode="SERVFAIL"` | Failed queries |

## Creating Dashboards in Dash0

Once metrics are flowing to Dash0, create queries to monitor:

### 1. DNS Request Rate (5-minute average)
```promql
rate(coredns_dns_requests_total[5m])
```

### 2. DNS Cache Hit Ratio
```promql
sum(rate(coredns_cache_hits_total[5m])) /
(sum(rate(coredns_cache_hits_total[5m])) + sum(rate(coredns_cache_misses_total[5m])))
```

### 3. DNS Query Latency (p95)
```promql
histogram_quantile(0.95, sum(rate(coredns_dns_request_duration_seconds_bucket[5m])) by (le))
```

### 4. Failed DNS Queries
```promql
sum(rate(coredns_dns_responses_total{rcode=~"NXDOMAIN|SERVFAIL"}[5m])) by (rcode)
```

## Troubleshooting

### Metrics not appearing in Dash0

1. **Check if Prometheus plugin is enabled:**
   ```bash
   kubectl get configmap coredns -n kube-system -o yaml | grep prometheus
   ```

2. **Verify coredns-metrics service exists:**
   ```bash
   kubectl get service -n kube-system coredns-metrics
   ```

3. **Check Dash0 operator logs:**
   ```bash
   kubectl logs -n dash0-operator deployment/dash0-operator | tail -50
   ```

4. **Test metrics endpoint directly:**
   ```bash
   kubectl exec -n kube-system deployment/coredns -- \
     wget -O- http://localhost:9053/metrics
   ```

### CoreDNS metrics show in Prometheus but not Dash0

- Verify `DASH0_AUTH_TOKEN` and `DASH0_DATASET` are set correctly
- Check that the Dash0 operator has proper permissions to scrape metrics
- Review Dash0 operator configuration in `kubernetes/base/dash0-operator-config.yaml`

## Next Steps

1. Create alerting rules for CoreDNS in Dash0
2. Set up synthetic checks for DNS resolution
3. Correlate DNS latency with application performance issues
4. Monitor CoreDNS resource usage (CPU, memory) via kubelet metrics

## References

- [CoreDNS Documentation](https://coredns.io/)
- [CoreDNS Prometheus Plugin](https://coredns.io/plugins/metrics/)
- [k3d Documentation](https://k3d.io/)
- [Dash0 Documentation](https://docs.dash0.com/)
