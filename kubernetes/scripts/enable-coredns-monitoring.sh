#!/bin/bash

# Enable CoreDNS Prometheus metrics monitoring
# This script patches k3d's CoreDNS to expose metrics on port 9053
# and verifies the setup is working

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "================================"
echo "CoreDNS Monitoring Setup"
echo "================================"
echo ""

# Check if CoreDNS is running
echo "1. Checking if CoreDNS is running..."
if ! kubectl get deployment -n kube-system coredns &>/dev/null; then
    echo "❌ CoreDNS deployment not found in kube-system namespace"
    exit 1
fi
echo "✓ CoreDNS found"
echo ""

# Check current CoreDNS config
echo "2. Checking CoreDNS configuration..."
CURRENT_CONFIG=$(kubectl get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}')

if echo "$CURRENT_CONFIG" | grep -q "prometheus"; then
    echo "✓ Prometheus plugin is already enabled"
    METRICS_PORT=$(echo "$CURRENT_CONFIG" | grep "prometheus" | grep -oE "[0-9]+$" || echo "9153")
    echo "   (Metrics exposed on port: $METRICS_PORT)"
else
    echo "⚠ Prometheus plugin not found, enabling now..."

    # Enable Prometheus plugin by patching the Corefile
    # k3d's CoreDNS should use port 9153 for Prometheus metrics
    PATCHED_CONFIG='.:53 {
    errors
    health
    ready
    kubernetes cluster.local in-addr.arpa ip6.arpa {
      pods insecure
      fallthrough in-addr.arpa ip6.arpa
      ttl 30
    }
    prometheus :9153
    forward . /etc/resolv.conf
    cache 30
    loop
    reload
    loadbalance
}'

    kubectl patch configmap coredns -n kube-system \
        --type='json' \
        -p="[{\"op\": \"replace\", \"path\": \"/data/Corefile\", \"value\":$(echo "$PATCHED_CONFIG" | jq -Rs .)}]"

    echo "✓ Patched CoreDNS ConfigMap"

    # Restart CoreDNS to apply the new configuration
    echo "3. Restarting CoreDNS to apply configuration..."
    kubectl rollout restart deployment/coredns -n kube-system
    kubectl rollout status deployment/coredns -n kube-system --timeout=2m
    echo "✓ CoreDNS restarted"
fi
echo ""

# Verify metrics endpoint
echo "3. Verifying metrics endpoint..."
echo "   Checking if CoreDNS metrics are accessible on port 9153..."

# Create a temporary port-forward in the background
kubectl port-forward -n kube-system deployment/coredns 9153:9153 &
PF_PID=$!
sleep 2

# Test the metrics endpoint
if curl -s http://localhost:9153/metrics 2>/dev/null | grep -q "coredns_dns_requests_total"; then
    echo "✓ CoreDNS metrics endpoint is responding on port 9153"
    METRICS_WORKING="true"
else
    echo "❌ CoreDNS metrics endpoint is not responding as expected"
    echo "   Checking if curl is working..."
    if ! curl -s http://localhost:9153/metrics 2>/dev/null | head -5; then
        echo "   Port-forward may not be ready. CoreDNS might still be starting."
    fi
    METRICS_WORKING="false"
fi

# Kill the port-forward
kill $PF_PID 2>/dev/null || true
wait $PF_PID 2>/dev/null || true
echo ""

# Check if coredns-monitoring.yaml exists
echo "4. Checking monitoring configuration..."
if [ -f "$PROJECT_ROOT/kubernetes/base/coredns-monitoring.yaml" ]; then
    echo "✓ coredns-monitoring.yaml found"
else
    echo "⚠ coredns-monitoring.yaml not found - please deploy the monitoring manifests"
fi
echo ""

# Verify the monitoring service
echo "5. Verifying monitoring service in kube-system namespace..."
if kubectl get service -n kube-system coredns-metrics &>/dev/null; then
    echo "✓ coredns-metrics service exists"

    # Show service details
    CLUSTER_IP=$(kubectl get service -n kube-system coredns-metrics -o jsonpath='{.spec.clusterIP}')
    echo "   Cluster IP: $CLUSTER_IP"
    echo "   Port: 9153"
else
    echo "⚠ coredns-metrics service not found - deploying kubernetes/base/coredns-monitoring.yaml"
    echo "   Run: kubectl apply -k kubernetes/base/"
fi
echo ""

# Final status
echo "================================"
echo "Setup Summary"
echo "================================"
echo ""
if [ "$METRICS_WORKING" = "true" ]; then
    echo "✓ CoreDNS monitoring is ready!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy the monitoring manifests: kubectl apply -k kubernetes/"
    echo "2. Ensure Dash0 operator is running with prometheusScraping enabled"
    echo "3. Wait a few minutes for Dash0 to scrape metrics"
    echo "4. Check Dash0 dashboard for coredns_dns_requests_total metrics"
    echo ""
    echo "View metrics in real-time:"
    echo "  kubectl port-forward -n kube-system deployment/coredns 9153:9153"
    echo "  curl http://localhost:9153/metrics"
else
    echo "⚠ CoreDNS metrics endpoint needs attention"
    echo "Please check:"
    echo "1. CoreDNS ConfigMap has 'prometheus :9153' configured"
    echo "2. CoreDNS pod is running and healthy:"
    echo "   kubectl get pod -n kube-system -l k8s-app=kube-dns"
    echo "3. Port 9153 is accessible from CoreDNS pod:"
    echo "   kubectl port-forward -n kube-system deployment/coredns 9153:9153"
    echo "   curl http://localhost:9153/metrics"
fi
echo ""
