# Troubleshooting Web Events and Bot/Website Activity

This guide helps you diagnose and fix issues with web events not appearing in Dash0, specifically for the bot and website components.

## Quick Diagnosis

### 1. Check if Website and Bot Pods are Running

```bash
# For Kubernetes
kubectl get pods -n apollo-dash0-demo | grep -E "website|bot"

# Expected output should show:
# willful-waste-website-xxxxx   1/1   Running   0   10h
# willful-waste-bot-xxxxx       1/1   Running   0   10h
```

### 2. Check if Requests Are Being Made

```bash
# Monitor router logs for incoming requests
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo

# Look for HTTP requests like:
# HTTP GET / (these are health checks or web requests)
# Look for GraphQL POST requests with operation names
```

### 3. Check if Router Can Reach Dash0

```bash
# View router errors related to telemetry
kubectl logs deployment/apollo-router -n apollo-dash0-demo | grep -i "error\|timeout\|dash0"

# Common issues:
# - "OpenTelemetry trace error occurred: Exporting timed out after 30 seconds"
# - "error sending request for url (https://ingress.*.aws.dash0.com)"
# - Connection refused to subgraph services
```

## Common Issues and Solutions

### Issue 1: Bot Getting 404 Errors

**Symptoms:**
```
GraphQL Query Error: Request failed with status code 404
```

**Causes:**
- GraphQL endpoint URL is incorrect or unreachable
- Router is not responding to GraphQL requests
- Bot is using wrong URL in ConfigMap

**Solutions:**

1. **Verify the GraphQL endpoint URL in the bot ConfigMap:**
   ```bash
   kubectl get configmap apollo-config -n apollo-dash0-demo -o jsonpath='{.data.GRAPHQL_URL}'
   # Should output: http://apollo-router:4000/graphql
   ```

2. **Test GraphQL endpoint from bot pod:**
   ```bash
   kubectl exec -it deployment/willful-waste-bot -n apollo-dash0-demo -- bash
   # Inside the pod:
   curl -X POST http://apollo-router:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{ __typename }"}'
   ```

3. **Check if router service is accessible:**
   ```bash
   kubectl get svc apollo-router -n apollo-dash0-demo
   kubectl get endpoints apollo-router -n apollo-dash0-demo
   ```

### Issue 2: Bot Browser Sessions Timing Out

**Symptoms:**
```
[Bot 1] Failed to create browser session: Network.enable timed out
```

**Causes:**
- Puppeteer/Chromium doesn't have enough resources
- Network timeout is too short
- Container resources are limited

**Solutions:**

1. **Increase resource limits in website-bot.yaml:**
   ```yaml
   resources:
     requests:
       memory: "512Mi"
       cpu: "500m"
     limits:
       memory: "1Gi"
       cpu: "1000m"
   ```

2. **Update bot configuration for longer timeouts:**
   Edit `kubernetes/base/website-bot.yaml` and add protocol timeout:
   ```javascript
   // In shared/website-bot/bot.js
   const browser = await puppeteer.launch({
     headless: CONFIG.headless,
     args: ['--no-sandbox', '--disable-setuid-sandbox'],
     protocolTimeout: 120000, // 2 minutes instead of default
   })
   ```

3. **Reduce concurrent bots if resources are limited:**
   ```bash
   kubectl set env deployment/willful-waste-bot \
     CONCURRENT_BOTS=1 \
     -n apollo-dash0-demo
   ```

### Issue 3: No Telemetry Data in Dash0

**Symptoms:**
- No metrics/traces appearing in Dash0 UI
- Router logs show timeout errors

**Common Error Messages:**
```
OpenTelemetry trace error occurred: [otlp traces] error sending request for url (https://ingress.us-west-2.aws.dash0.com/v1/traces)
OpenTelemetry metric error occurred: Metrics error: [otlp metrics] http request failed
```

**Causes:**
1. Network connectivity issues between k3d cluster and Dash0 SaaS
2. Invalid auth token
3. Invalid dataset name
4. Incorrect endpoint URLs
5. Dash0 subscription inactive or credentials expired

**Solutions:**

1. **Verify Dash0 credentials are correct:**
   ```bash
   # Check your .env file
   cat .env | grep DASH0

   # Verify token format (should start with "auth_")
   echo $DASH0_AUTH_TOKEN | grep -o "^auth_"
   ```

2. **Verify endpoints are correct for your region:**
   ```bash
   # List configured endpoints
   kubectl get configmap apollo-config -n apollo-dash0-demo -o jsonpath='{.data}' | jq '.DASH0_METRICS_ENDPOINT, .DASH0_TRACES_ENDPOINT'

   # Verify region matches your Dash0 account
   # Available regions: us-east-1, us-west-2, eu-west-1, etc.
   ```

3. **Test connectivity from cluster to Dash0:**
   ```bash
   # Create a test pod
   kubectl run test-curl --image=curlimages/curl:latest \
     -n apollo-dash0-demo --rm -it -- bash

   # Inside the pod:
   curl -v https://ingress.us-west-2.aws.dash0.com/v1/health \
     -H "Authorization: Bearer auth_your_token_here"
   ```

4. **Verify dataset exists in Dash0:**
   - Log into https://app.dash0.com
   - Check if dataset `apollo-router-demo` exists
   - Check if your subscription is active

5. **Restart router to apply configuration changes:**
   ```bash
   kubectl rollout restart deployment/apollo-router -n apollo-dash0-demo
   kubectl wait --for=condition=available --timeout=60s deployment/apollo-router -n apollo-dash0-demo
   ```

### Issue 4: Subgraph Services Not Reachable

**Symptoms:**
```
tcp connect error: Connection refused
SubrequestHttpError { status_code: None, service: "accounts", reason: "tcp connect error" }
```

**Causes:**
- Subgraph pods haven't started yet
- Service DNS resolution not working
- Network policy blocking traffic

**Solutions:**

1. **Check if all subgraph services are running:**
   ```bash
   kubectl get pods -n apollo-dash0-demo -o wide

   # All pods should show "Running" status
   # Check for pods in "CrashLoopBackOff" or "Pending"
   ```

2. **Check subgraph logs for startup issues:**
   ```bash
   kubectl logs deployment/accounts -n apollo-dash0-demo --tail=50
   kubectl logs deployment/products -n apollo-dash0-demo --tail=50
   kubectl logs deployment/reviews -n apollo-dash0-demo --tail=50
   kubectl logs deployment/inventory -n apollo-dash0-demo --tail=50
   ```

3. **Verify service DNS resolution within cluster:**
   ```bash
   # Run busybox for DNS testing
   kubectl run -it --image=busybox:1.28 dns-test --restart=Never -n apollo-dash0-demo -- bash

   # Inside the pod:
   nslookup accounts-service
   nslookup products-service
   nslookup reviews-service
   nslookup inventory-service
   ```

4. **Check if services exist:**
   ```bash
   kubectl get svc -n apollo-dash0-demo | grep -E "accounts|products|reviews|inventory"
   ```

## Monitoring and Validation

### View Web Activity in Real-Time

```bash
# Watch router logs for HTTP and GraphQL requests
kubectl logs -f deployment/apollo-router -n apollo-dash0-demo | grep -E "HTTP|POST|GET"

# Example expected output:
# HTTP  11/11/2025 3:35:23 PM 10.42.1.8 GET /api?timeout=32s
# HTTP  11/11/2025 3:35:23 PM 10.42.1.8 Returned 304 in 1 ms
```

### Check Bot Activity

```bash
# View bot logs to see active sessions
kubectl logs -f deployment/willful-waste-bot -n apollo-dash0-demo

# Expected output:
# [Bot 1] Executing action: viewProducts
# [GraphQL Bot 3] Query 1 successful
```

### Monitor Request Rates

```bash
# Count GraphQL requests in the last minute
kubectl logs deployment/apollo-router -n apollo-dash0-demo --since=1m | grep -c "POST"

# Count HTTP requests in the last minute
kubectl logs deployment/apollo-router -n apollo-dash0-demo --since=1m | grep -c "HTTP"
```

### Validate Telemetry Export

```bash
# Check if metrics are being exported (look for batch_processor messages)
kubectl logs deployment/apollo-router -n apollo-dash0-demo | grep -i "batch_processor\|exporting"

# Check if traces are being sampled
kubectl logs deployment/apollo-router -n apollo-dash0-demo | grep -i "sampler\|trace"
```

## End-to-End Testing

### Step 1: Verify All Components are Running

```bash
./kubernetes/status.sh
# Should show: router, website, bot, and all subgraphs as "Running"
```

### Step 2: Test GraphQL API Directly

```bash
# Get the router's external IP
ROUTER_IP=$(kubectl get svc apollo-router -n apollo-dash0-demo -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Send a test query
curl -X POST http://$ROUTER_IP:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ topProducts { id name price } }"}'
```

### Step 3: Generate Traffic with Bot

```bash
# Verify bot is running and making requests
kubectl logs -f deployment/willful-waste-bot -n apollo-dash0-demo

# Should see lines like:
# [GraphQL Bot 3] Query 1 successful
# [Bot 1] Executing action: viewProducts
```

### Step 4: Check Router Metrics

```bash
# Query router metrics endpoint
kubectl port-forward deployment/apollo-router 8088:8088 -n apollo-dash0-demo &
curl http://localhost:8088/metrics | grep -E "apollo_router|http_"
kill %1
```

### Step 5: Verify Dash0 Reception

In Dash0 UI:
1. Navigate to **Logs** tab
2. Set filter to your dataset: `Dash0-Dataset: apollo-router-demo`
3. Look for entries with:
   - `service.name: apollo-router`
   - `service.name: willful-waste-bot`
   - `service.name: willful-waste-website`

## Performance Tuning

### Optimize Telemetry Export

Edit `kubernetes/helm-values/router-values.yaml`:

```yaml
telemetry:
  exporters:
    metrics:
      otlp:
        batch_processor:
          scheduled_delay: 5s  # Increase from 1s for less overhead
          max_concurrent_exports: 50
          max_export_batch_size: 256
    tracing:
      # Adjust sampling rate - lower = fewer traces sent
      common:
        sampler: 0.1  # 10% sampling instead of 25%
```

### Reduce Resource Usage

```bash
# Reduce number of bot concurrent sessions
kubectl set env deployment/willful-waste-bot \
  CONCURRENT_BOTS=1 \
  BOT_INTERVAL=30000 \
  -n apollo-dash0-demo
```

## Getting Help

If issues persist:

1. **Collect debug information:**
   ```bash
   # Export logs for analysis
   kubectl logs deployment/apollo-router -n apollo-dash0-demo > router.log
   kubectl logs deployment/willful-waste-bot -n apollo-dash0-demo > bot.log
   kubectl logs deployment/willful-waste-website -n apollo-dash0-demo > website.log
   ```

2. **Check Dash0 status:**
   - Visit https://status.dash0.com
   - Verify your region is operational

3. **Review configuration:**
   ```bash
   # Export current configuration
   kubectl get configmap apollo-config -n apollo-dash0-demo -o yaml > config.yaml
   # Review Dash0 settings
   kubectl get secrets dash0-auth -n apollo-dash0-demo -o yaml
   ```
