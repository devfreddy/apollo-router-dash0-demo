#!/bin/bash

# Diagnostic script for troubleshooting web events in Dash0
# This script checks all components and provides actionable feedback

set +e  # Don't exit on error, we want to see all results

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

NAMESPACE="apollo-dash0-demo"

echo -e "${BLUE}=== Web Events Diagnostic Tool ===${NC}\n"

# Check 1: Verify pods are running
echo -e "${YELLOW}1. Checking if website and bot pods are running...${NC}"
echo ""

pods_running=0
for pod in "willful-waste-website" "willful-waste-bot" "apollo-router"; do
    status=$(kubectl get deployment $pod -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null)
    desired=$(kubectl get deployment $pod -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null)

    if [ "$status" = "$desired" ] && [ ! -z "$status" ]; then
        echo -e "${GREEN}✓ $pod${NC}: $status/$desired replicas running"
        pods_running=$((pods_running + 1))
    else
        echo -e "${RED}✗ $pod${NC}: Not ready (Expected: $desired, Ready: $status)"
    fi
done

echo ""

# Check 2: Monitor recent HTTP requests
echo -e "${YELLOW}2. Checking for HTTP requests in router logs (last 30 seconds)...${NC}"
echo ""

http_count=$(kubectl logs deployment/apollo-router -n $NAMESPACE --since=30s 2>/dev/null | grep -c "HTTP" || echo "0")
post_count=$(kubectl logs deployment/apollo-router -n $NAMESPACE --since=30s 2>/dev/null | grep -c "POST" || echo "0")

if [ "$http_count" -gt "0" ]; then
    echo -e "${GREEN}✓ HTTP requests found:${NC}"
    echo "  - HTTP requests in last 30s: $http_count"
    echo "  - GraphQL POST requests in last 30s: $post_count"
else
    echo -e "${RED}✗ No HTTP requests found in last 30 seconds${NC}"
    echo "  This might indicate:"
    echo "  - Bot is not running or making requests"
    echo "  - Website is not being accessed"
    echo "  - Requests are being blocked before reaching router"
fi

echo ""

# Check 3: Bot status
echo -e "${YELLOW}3. Checking bot activity...${NC}"
echo ""

bot_logs=$(kubectl logs deployment/willful-waste-bot -n $NAMESPACE --tail=5 2>/dev/null)
if echo "$bot_logs" | grep -q "successful\|Executing"; then
    echo -e "${GREEN}✓ Bot is active${NC}"
    echo "  Recent activity:"
    echo "$bot_logs" | head -3 | sed 's/^/    /'
else
    if echo "$bot_logs" | grep -q "404"; then
        echo -e "${RED}✗ Bot is getting 404 errors${NC}"
        echo "  Likely cause: GraphQL endpoint URL is incorrect or router is not responding"
    elif echo "$bot_logs" | grep -q "timeout"; then
        echo -e "${RED}✗ Bot browser sessions are timing out${NC}"
        echo "  Likely cause: Insufficient resources or slow network"
    else
        echo -e "${YELLOW}! Bot status unclear. Last logs:${NC}"
        echo "$bot_logs" | head -3 | sed 's/^/    /'
    fi
fi

echo ""

# Check 4: Dash0 connectivity
echo -e "${YELLOW}4. Checking Dash0 telemetry configuration...${NC}"
echo ""

# Get configuration from ConfigMap
dataset=$(kubectl get configmap apollo-config -n $NAMESPACE -o jsonpath='{.data.DASH0_DATASET}' 2>/dev/null)
metrics_endpoint=$(kubectl get configmap apollo-config -n $NAMESPACE -o jsonpath='{.data.DASH0_METRICS_ENDPOINT}' 2>/dev/null)
traces_endpoint=$(kubectl get configmap apollo-config -n $NAMESPACE -o jsonpath='{.data.DASH0_TRACES_ENDPOINT}' 2>/dev/null)
token_exists=$(kubectl get secret dash0-auth -n $NAMESPACE -o jsonpath='{.data.token}' 2>/dev/null | wc -c)

echo "Configuration:"
echo "  Dataset: $dataset"
echo "  Metrics Endpoint: $metrics_endpoint"
echo "  Traces Endpoint: $traces_endpoint"
echo "  Auth Token: $([ "$token_exists" -gt 10 ] && echo "✓ Present" || echo "✗ Missing")"

# Check for telemetry export errors
error_count=$(kubectl logs deployment/apollo-router -n $NAMESPACE --since=5m 2>/dev/null | grep -c "OpenTelemetry.*error\|Exporting timed out" || echo "0")

if [ "$error_count" -gt "0" ]; then
    echo -e "${RED}✗ Router telemetry export errors found:${NC}"
    echo "  Recent errors (last 5 minutes): $error_count"
    echo ""
    echo "  Error details:"
    kubectl logs deployment/apollo-router -n $NAMESPACE --since=5m 2>/dev/null | grep -i "OpenTelemetry.*error\|Exporting timed out" | tail -3 | sed 's/^/    /'
    echo ""
    echo "  Possible causes:"
    echo "  - Network connectivity issues between cluster and Dash0"
    echo "  - Invalid auth token"
    echo "  - Invalid endpoint URL"
    echo "  - Dash0 subscription inactive"
else
    echo -e "${GREEN}✓ No recent telemetry export errors${NC}"
fi

echo ""

# Check 5: Subgraph connectivity
echo -e "${YELLOW}5. Checking subgraph service connectivity...${NC}"
echo ""

error_count=$(kubectl logs deployment/apollo-router -n $NAMESPACE --since=5m 2>/dev/null | grep -c "tcp connect error\|Connection refused" || echo "0")

if [ "$error_count" -gt "0" ]; then
    echo -e "${YELLOW}! Subgraph connection errors found:${NC}"
    echo "  Recent errors (last 5 minutes): $error_count"
    echo ""
    echo "  This might be:"
    echo "  - Subgraph pods still starting up"
    echo "  - Service DNS not resolved"
    echo "  - Network policy blocking traffic"
else
    echo -e "${GREEN}✓ No subgraph connection errors${NC}"
fi

echo ""

# Check 6: Summary and recommendations
echo -e "${BLUE}=== Summary & Next Steps ===${NC}"
echo ""

if [ "$pods_running" -eq "3" ] && [ "$http_count" -gt "0" ]; then
    echo -e "${GREEN}✓ System appears to be functioning properly!${NC}"
    echo ""
    echo "If you're still not seeing events in Dash0:"
    echo "1. Check Dash0 UI: https://app.dash0.com"
    echo "2. Set filter to your dataset: Dash0-Dataset = $dataset"
    echo "3. Check Logs/Metrics/Traces tabs"
    echo "4. Verify your auth token in .env matches Dash0 account"
    echo ""
    echo "To generate more traffic:"
    echo "  kubectl set env deployment/willful-waste-bot CONCURRENT_BOTS=3 -n $NAMESPACE"
else
    echo -e "${RED}✗ Issues detected. Recommended troubleshooting steps:${NC}"
    echo ""

    if [ "$pods_running" -lt "3" ]; then
        echo "1. Check pod status and logs:"
        echo "   kubectl describe pod -n $NAMESPACE | grep -A 5 'willful-waste'"
        echo "   kubectl logs deployment/willful-waste-website -n $NAMESPACE --tail=20"
        echo "   kubectl logs deployment/willful-waste-bot -n $NAMESPACE --tail=20"
        echo ""
    fi

    if [ "$http_count" -eq "0" ]; then
        echo "2. Verify bot is correctly configured:"
        echo "   kubectl get configmap apollo-config -n $NAMESPACE -o yaml | grep -E 'GRAPHQL|BOT'"
        echo "   kubectl logs deployment/willful-waste-bot -n $NAMESPACE | tail -20"
        echo ""
    fi

    echo "3. Check network connectivity and Dash0 credentials:"
    echo "   cat .env | grep DASH0"
    echo ""
fi

echo -e "${YELLOW}For detailed troubleshooting, see: docs/TROUBLESHOOTING_WEB_EVENTS.md${NC}"
echo ""
