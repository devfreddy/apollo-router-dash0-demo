# Willful Waste Bot - Traffic Generation

An automated bot that generates realistic traffic on the Willful Waste retail store website. The bot simulates various user behaviors including browsing products, viewing details, scrolling, and refreshing pages. It also makes direct GraphQL queries to stress-test the backend.

## Features

- **Realistic User Simulation**: Mimics natural user browsing patterns
- **Multi-Device Testing**: Simulates different device viewports (desktop, tablet, mobile)
- **User Agent Rotation**: Varies user agents to appear as different browsers
- **GraphQL Query Testing**: Direct GraphQL API testing alongside browser automation
- **Configurable Intensity**: Control bot count, interval, and session duration
- **Concurrent Sessions**: Multiple bots running simultaneously
- **Headless & Headed Modes**: Run with or without visual browser windows
- **Error Handling**: Robust error handling and graceful degradation

## Use Cases

- **Load Testing**: Generate realistic load on the website and GraphQL API
- **Performance Testing**: Measure response times under concurrent user load
- **Observability**: Test your monitoring and alerting systems (Dash0)
- **QA Testing**: Verify website functionality under traffic
- **Cache Testing**: Test cache behavior with repeated requests
- **Error Injection Testing**: Observe how monitoring captures errors

## Project Structure

```
website-bot/
├── bot.js                  # Main bot implementation
├── package.json            # NPM dependencies
├── Dockerfile              # Container image definition
├── .env.example            # Environment variables template
└── README.md              # This file
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Website running on port 3000 (or configured URL)
- Apollo Router GraphQL endpoint on port 4000 (or configured URL)
- For Docker: Chromium or Chrome installed in the image

## Installation & Development

### Local Development

```bash
# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Edit .env with your configuration
# WEBSITE_URL=http://localhost:3000
# GRAPHQL_URL=http://localhost:4000/graphql
# BOT_INTERVAL=10000
# SESSION_DURATION=300000
# CONCURRENT_BOTS=3

# Start the bot
npm start
```

### Watch Mode (Development)

```bash
npm run dev
```

## Configuration

Edit `.env` file to customize bot behavior:

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `WEBSITE_URL` | Target website URL | `http://localhost:3000` | Must be accessible from bot |
| `GRAPHQL_URL` | GraphQL endpoint URL | `http://localhost:4000/graphql` | Used for direct API queries |
| `BOT_INTERVAL` | Delay between actions (ms) | `10000` | 10 seconds between actions |
| `SESSION_DURATION` | How long each bot runs (ms) | `300000` | 5 minutes per session |
| `CONCURRENT_BOTS` | Number of browser bots | `3` | Higher = more load |
| `HEADLESS` | Run browsers headless | `true` | Set to `false` to see browsers |

## Docker

### Build Docker Image

```bash
docker build -t apollo-dash0-demo-willful-waste-bot:latest .
```

### Run in Docker

```bash
docker run \
  -e WEBSITE_URL="http://host.docker.internal:3000" \
  -e GRAPHQL_URL="http://host.docker.internal:4000/graphql" \
  -e CONCURRENT_BOTS="2" \
  apollo-dash0-demo-willful-waste-bot:latest
```

### Run in Docker with Visible Browser

```bash
docker run \
  -e HEADLESS="false" \
  -e WEBSITE_URL="http://host.docker.internal:3000" \
  -e GRAPHQL_URL="http://host.docker.internal:4000/graphql" \
  --cap-add=SYS_ADMIN \
  apollo-dash0-demo-willful-waste-bot:latest
```

## Kubernetes Deployment

### Deploy to Kubernetes

```bash
# From the project root
./kubernetes/scripts/k3d-up.sh
```

The bot is automatically configured in the Kubernetes deployment with:

- **Resources**: 512Mi memory, 500m CPU request; 1Gi memory, 1000m CPU limit
- **Replica Set**: 2 concurrent bot pods
- **Environment**: Pre-configured to point to internal Kubernetes services
- **Restart Policy**: Automatically restarts failed bots

### Manual Kubernetes Deployment

```bash
kubectl apply -k kubernetes/base
```

### View Bot Activity

```bash
# Check bot deployment status
kubectl get deployment -n apollo-dash0-demo willful-waste-bot

# View bot logs (follow)
kubectl logs -f deployment/willful-waste-bot -n apollo-dash0-demo

# View logs from specific pod
kubectl logs -f pod/willful-waste-bot-xxx -n apollo-dash0-demo

# Scale bot replicas
kubectl scale deployment willful-waste-bot --replicas=5 -n apollo-dash0-demo
```

## Bot Actions

The bot performs the following actions in random sequence:

### `viewProducts`
- Navigates to the website homepage
- Waits for products to load
- Counts loaded products

### `scrollPage`
- Scrolls down the page to reveal more content
- Simulates user interest in additional products

### `viewInventory`
- Clicks a random "Details" button
- Waits for the inventory modal to appear
- Views inventory information for a random duration

### `waitAndRefresh`
- Waits for 2-7 seconds
- Refreshes the entire page
- Waits for content to reload

### `viewDetails`
- Similar to `viewInventory`
- Alternative action for viewing product details

## Bot Types

### Browser-Based Bots
- Simulates full browser automation using Puppeteer/Chromium
- Performs click, scroll, and navigation actions
- Excellent for testing UI functionality
- More resource-intensive
- Default count: `CONCURRENT_BOTS`

### GraphQL-Based Bots
- Makes direct GraphQL API calls
- Lightweight and fast
- Tests backend performance
- Lower resource overhead
- Count: ~50% of browser bots

## Performance Tuning

### Generate Light Load

```bash
CONCURRENT_BOTS=1
BOT_INTERVAL=30000
SESSION_DURATION=300000
```

### Generate Heavy Load

```bash
CONCURRENT_BOTS=10
BOT_INTERVAL=1000
SESSION_DURATION=600000
```

### Resource-Conscious (Container Deployments)

```bash
CONCURRENT_BOTS=2
BOT_INTERVAL=15000
HEADLESS=true
```

## Load Testing Examples

### Quick Smoke Test (2 minutes)

```bash
BOT_INTERVAL=5000 \
SESSION_DURATION=120000 \
CONCURRENT_BOTS=2 \
npm start
```

### Light Sustained Load (10 minutes)

```bash
BOT_INTERVAL=10000 \
SESSION_DURATION=600000 \
CONCURRENT_BOTS=3 \
npm start
```

### Heavy Load Test (30 minutes)

```bash
BOT_INTERVAL=2000 \
SESSION_DURATION=1800000 \
CONCURRENT_BOTS=8 \
npm start
```

## Monitoring Bot Activity

### View Metrics in Dash0

1. Open [Dash0 Dashboard](https://app.dash0.com)
2. Navigate to your dataset
3. View services: `willful-waste-website`, `apollo-router`
4. Observe:
   - Request rate increase
   - Response time changes
   - Error rates (should be near 0)
   - GraphQL query performance

### Local Monitoring

```bash
# Watch logs in real-time
kubectl logs -f deployment/willful-waste-bot -n apollo-dash0-demo

# Monitor container resources
kubectl top pods -n apollo-dash0-demo

# View detailed pod info
kubectl describe pod <pod-name> -n apollo-dash0-demo
```

## Troubleshooting

### Bots Failing to Connect

1. Verify website is running and accessible
2. Check `WEBSITE_URL` and `GRAPHQL_URL` configuration
3. Review error logs: `npm start 2>&1 | tee bot.log`
4. Test connectivity: `curl http://localhost:3000`

### High Memory Usage

1. Reduce `CONCURRENT_BOTS` count
2. Reduce `SESSION_DURATION`
3. Increase `BOT_INTERVAL` to slow down actions
4. Set `HEADLESS=true` to disable visual rendering

### Slow Performance

1. Check if website/GraphQL is responding slowly
2. Reduce concurrent bots
3. Increase interval between actions
4. Review Dash0 backend metrics

### Docker Connection Issues

Use `host.docker.internal` instead of `localhost`:

```bash
WEBSITE_URL=http://host.docker.internal:3000
GRAPHQL_URL=http://host.docker.internal:4000/graphql
```

### Kubernetes DNS Issues

Ensure DNS is working:

```bash
kubectl exec -it deployment/willful-waste-bot -- nslookup apollo-router.apollo-dash0-demo
```

## Testing Your Setup

### Step 1: Start Website and Backend

```bash
# From project root
./kubernetes/scripts/k3d-up.sh
```

### Step 2: Verify Website is Accessible

```bash
# Wait for website to be ready
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80

# In another terminal
curl http://localhost:3000
```

### Step 3: Start Bot Locally

```bash
cd website-bot
npm install
npm start
```

### Step 4: Monitor in Dash0

1. Open Dash0 dashboard
2. Check `willful-waste-website` service for RUM metrics
3. Check `apollo-router` for increased request rate
4. Verify error rate remains low

## Advanced Usage

### Custom Bot Behavior

To add custom actions, edit `bot.js` and add to the `actions` array:

```javascript
async function customAction(page, botId) {
  console.log(`[Bot ${botId}] Doing something custom...`)
  // Your code here
  return true
}

// Add to actions array
actions.push('customAction')
```

### Load Pattern Simulation

Modify bot logic to simulate specific user patterns:

```javascript
// Peak hour traffic
const isPeakHour = new Date().getHours() >= 9 && new Date().getHours() <= 17
const botsToRun = isPeakHour ? 10 : 2
```

## Performance Expectations

### Typical Metrics (3 concurrent bots)

- **Website Requests**: ~15-20 per minute
- **GraphQL Queries**: ~10-15 per minute
- **Page Load Time**: 100-500ms (depends on backend)
- **Memory per Bot**: 150-200MB
- **CPU per Bot**: 20-40%

## Stopping the Bot

```bash
# From the terminal running npm start
Ctrl+C

# In Kubernetes
kubectl delete deployment willful-waste-bot -n apollo-dash0-demo

# Scale down replicas
kubectl scale deployment willful-waste-bot --replicas=0 -n apollo-dash0-demo
```

## Contributing

When modifying the bot:

1. Test locally first
2. Verify resource usage
3. Check error handling
4. Document configuration changes
5. Test in Kubernetes

## License

Part of the Apollo Router Dash0 Demo project
