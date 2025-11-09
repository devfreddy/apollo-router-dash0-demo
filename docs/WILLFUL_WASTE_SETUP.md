# Willful Waste Retail Store - Complete Setup Guide

This guide walks you through setting up and running the Willful Waste retail store website with the Apollo Router GraphQL gateway, Dash0 observability, and an automated bot for traffic generation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Willful Waste Website (React)                 │
│                         Port 3000                                 │
│                  Dash0 RUM Agent Instrumented                    │
└───────────────────┬─────────────────────────────┬────────────────┘
                    │                             │
                    │ GraphQL Queries            │ Direct API
                    │                             │ Calls (Bot)
┌─────────────────────────────────────────────────────┐
│         Apollo Router (GraphQL Gateway)             │
│              Port 4000                              │
│      Telemetry: OpenTelemetry + Dash0              │
└────────────────────┬────────────────────────────────┘
           │         │          │          │
      ┌────┴──┐ ┌────┴──┐ ┌─────┴──┐ ┌─────┴──┐
      │Products│ │Reviews│ │Accounts│ │Inventory│
      │Subgraph│ │Subgraph│ │Subgraph│ │Subgraph│
      └────────┘ └────────┘ └────────┘ └────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Willful Waste Bot (Automation)                      │
│        Port (None) - Makes HTTP/GraphQL Requests               │
│         Simulates User Behavior for Load Testing               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Dash0 Observability Platform                        │
│        Metrics, Traces, Logs, RUM Data Collection              │
│          https://app.dash0.com/datasets/[name]                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start (5 minutes)

### Prerequisites

- Docker & Docker Compose
- kubectl (for Kubernetes deployment)
- Node.js 18+ (for local development)
- Dash0 account with API token (optional but recommended)

### Option 1: Docker Compose (Easiest)

```bash
# 1. Build and start all services
docker-compose up -d

# 2. Wait for services to be healthy (30-60 seconds)
docker-compose ps

# 3. Access the website
open http://localhost:3000

# 4. View logs
docker-compose logs -f willful-waste-website

# 5. Start the bot (optional)
docker-compose --profile bot up -d willful-waste-bot

# 6. Stop everything
docker-compose down
```

### Option 2: Kubernetes (Production-like)

```bash
# 1. Full deployment with all services
./k8s/scripts/k3d-up.sh

# 2. Verify deployment
kubectl get all -n apollo-dash0-demo

# 3. Port forward to website
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80

# 4. Access the website
open http://localhost:3000

# 5. View website logs
kubectl logs -f deployment/willful-waste-website -n apollo-dash0-demo

# 6. View bot logs
kubectl logs -f deployment/willful-waste-bot -n apollo-dash0-demo
```

### Option 3: Local Development

```bash
# 1. Start backend services
docker-compose up -d router accounts products-py reviews inventory

# 2. Wait for services to be healthy
sleep 30

# 3. Install website dependencies
cd website
npm install

# 4. Start development server
npm run dev

# 5. In another terminal, start the bot
cd website-bot
npm install
npm start

# 6. Access website at http://localhost:3000
```

## Detailed Setup

### Step 1: Environment Configuration

The stack uses environment variables from `.env` file:

```bash
# Create .env if not present (copy from .env.sample)
cp .env.sample .env

# Edit .env with your Dash0 credentials
# DASH0_AUTH_TOKEN=auth_XXXXX
# DASH0_DATASET=apollo-router-demo
```

Key variables:
- `DASH0_AUTH_TOKEN`: Your Dash0 API token (from https://app.dash0.com/settings/api-tokens)
- `DASH0_DATASET`: Dataset name where data will be sent
- `ENVIRONMENT`: demo/staging/production

### Step 2: Website Setup

The website is a React + Vite application with the following features:

**Files:**
- [website/src/App.tsx](../website/src/App.tsx) - Main application component
- [website/src/components/ProductCard.tsx](../website/src/components/ProductCard.tsx) - Product display
- [website/src/components/InventoryModal.tsx](../website/src/components/InventoryModal.tsx) - Inventory details
- [website/src/queries.ts](../website/src/queries.ts) - GraphQL queries

**Local Development:**

```bash
cd website

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env as needed

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Running in Docker:**

```bash
# Build the image
docker build -t apollo-dash0-demo-willful-waste-website:latest website/

# Run the container
docker run -p 3000:3000 \
  -e VITE_GRAPHQL_URL=http://localhost:4000/graphql \
  apollo-dash0-demo-willful-waste-website:latest
```

### Step 3: Bot Setup

The bot simulates user traffic for load testing and observability validation.

**Files:**
- [website-bot/bot.js](../website-bot/bot.js) - Main bot implementation
- [website-bot/package.json](../website-bot/package.json) - Dependencies

**Local Development:**

```bash
cd website-bot

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env to set WEBSITE_URL, GRAPHQL_URL, etc.

# Start the bot
npm start

# Watch mode with auto-reload
npm run dev
```

**Running in Docker:**

```bash
# Build the image
docker build -t apollo-dash0-demo-willful-waste-bot:latest website-bot/

# Run the container
docker run \
  -e WEBSITE_URL=http://host.docker.internal:3000 \
  -e GRAPHQL_URL=http://host.docker.internal:4000/graphql \
  -e CONCURRENT_BOTS=2 \
  apollo-dash0-demo-willful-waste-bot:latest
```

### Step 4: Docker Compose Orchestration

The `docker-compose.yaml` includes both the website and bot:

**Run everything:**

```bash
# Start all services (without bot)
docker-compose up -d

# Start all services (with bot)
docker-compose --profile bot up -d

# View logs
docker-compose logs -f

# Specific service logs
docker-compose logs -f willful-waste-website
docker-compose logs -f willful-waste-bot

# Stop all services
docker-compose down

# Remove volumes and start fresh
docker-compose down -v
docker-compose up -d
```

**Service Dependencies:**

```
router ← depends on → accounts, products-py, reviews, inventory
willful-waste-website ← depends on → router
willful-waste-bot ← depends on → router, willful-waste-website
```

### Step 5: Kubernetes Deployment

**Full deployment (recommended):**

```bash
# One-command deployment of everything
./k8s/scripts/k3d-up.sh

# This includes:
# - k3d cluster creation
# - Namespace setup
# - ConfigMaps and Secrets
# - All subgraphs
# - Apollo Router
# - Willful Waste Website
# - Willful Waste Bot
# - Dash0 Operator (if enabled)
```

**Manual Kubernetes deployment:**

```bash
# Create namespace
kubectl create namespace apollo-dash0-demo

# Create ConfigMaps from .env
kubectl create configmap apollo-config \
  --from-literal=DASH0_DATASET=apollo-router-demo \
  -n apollo-dash0-demo

# Deploy with Kustomize
kubectl apply -k k8s/base

# Verify deployment
kubectl get all -n apollo-dash0-demo
kubectl get pods -n apollo-dash0-demo -w

# Access services
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80
kubectl port-forward -n apollo-dash0-demo svc/apollo-router 4000:4000
```

**Managing deployments:**

```bash
# View pod status
kubectl get pods -n apollo-dash0-demo

# View logs
kubectl logs -f deployment/willful-waste-website -n apollo-dash0-demo
kubectl logs -f deployment/willful-waste-bot -n apollo-dash0-demo

# Scale website replicas
kubectl scale deployment willful-waste-website --replicas=3 -n apollo-dash0-demo

# Scale bot instances
kubectl scale deployment willful-waste-bot --replicas=5 -n apollo-dash0-demo

# Restart a deployment
kubectl rollout restart deployment/willful-waste-website -n apollo-dash0-demo

# View resource usage
kubectl top pods -n apollo-dash0-demo
```

## Verifying the Setup

### 1. Check Website is Running

```bash
# Local
curl http://localhost:3000

# Kubernetes
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80
curl http://localhost:3000
```

Expected: HTML page with "Willful Waste" header

### 2. Check GraphQL Endpoint

```bash
# Local
curl -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products { id name price } }"}'

# Kubernetes
kubectl port-forward -n apollo-dash0-demo svc/apollo-router 4000:4000
curl -X POST http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ products { id name price } }"}'
```

Expected: JSON response with product data

### 3. Check Bot Traffic

```bash
# View bot logs
docker-compose logs willful-waste-bot

# Or in Kubernetes
kubectl logs -f deployment/willful-waste-bot -n apollo-dash0-demo

# Look for:
# [Bot X] Executing action: viewProducts
# [Bot X] Clicked inventory button
```

### 4. Monitor in Dash0

1. Open [Dash0 Dashboard](https://app.dash0.com)
2. Select your dataset (configured in `.env`)
3. View:
   - **Services**: `willful-waste-website`, `apollo-router`
   - **Requests**: Increasing request rate from bot
   - **RUM**: Real User Monitoring metrics from website
   - **Metrics**: Response times, error rates

## Bot Configuration Examples

### Smoke Test (2 minutes)

```env
BOT_INTERVAL=5000
SESSION_DURATION=120000
CONCURRENT_BOTS=1
```

```bash
docker-compose --profile bot up -d
```

### Light Load (continuous)

```env
BOT_INTERVAL=10000
SESSION_DURATION=600000
CONCURRENT_BOTS=2
```

### Heavy Load (stress test)

```env
BOT_INTERVAL=1000
SESSION_DURATION=600000
CONCURRENT_BOTS=10
```

## GraphQL Queries Available

### Get All Products

```graphql
query {
  products {
    id
    name
    price
    description
    category
    inStock
    inventory {
      quantity
      warehouse
      estimatedDelivery
    }
  }
}
```

### Get Product Details

```graphql
query GetProductDetails($id: ID!) {
  product(id: $id) {
    id
    name
    price
    description
    category
    inStock
    reviews {
      id
      rating
      body
      author {
        name
      }
    }
  }
}
```

### Get Top Products

```graphql
query {
  topProducts(limit: 5) {
    id
    name
    price
    category
  }
}
```

## Troubleshooting

### Website Shows "Error loading products"

**Cause**: GraphQL endpoint not reachable

**Solution**:
```bash
# Check router is running
docker-compose ps router

# Test GraphQL endpoint
curl http://localhost:4000/graphql

# Check website logs for CORS errors
docker-compose logs willful-waste-website
```

### Bot Not Making Requests

**Cause**: Website or GraphQL endpoint not accessible

**Solution**:
```bash
# Check URLs in bot environment
docker-compose exec willful-waste-bot env | grep URL

# Test connectivity from bot
docker-compose exec willful-waste-bot curl http://willful-waste-website:3000

# Check bot logs
docker-compose logs willful-waste-bot
```

### High Memory Usage in Docker Compose

**Cause**: Too many concurrent bots

**Solution**:
```bash
# Reduce bot count
docker-compose down
# Edit docker-compose.yaml: CONCURRENT_BOTS=1
docker-compose --profile bot up -d
```

### Kubernetes Pods Not Ready

**Cause**: Services still starting up

**Solution**:
```bash
# Wait longer (up to 5 minutes)
kubectl get pods -n apollo-dash0-demo -w

# Check pod events
kubectl describe pod <pod-name> -n apollo-dash0-demo

# View startup logs
kubectl logs <pod-name> -n apollo-dash0-demo
```

## Performance Tips

1. **Use Kubernetes for production** - More resource-efficient than Docker Compose
2. **Scale bot replicas** - Increase load without increasing per-pod memory
3. **Monitor metrics** - Watch Dash0 dashboard for bottlenecks
4. **Adjust intervals** - Balance between realistic behavior and test speed

## File Locations Reference

| Component | Files | Port |
|-----------|-------|------|
| **Website** | `website/` | 3000 |
| **Bot** | `website-bot/` | (none) |
| **Router** | `router/` | 4000 |
| **Subgraphs** | `subgraphs/` | 4001-4004 |
| **Kubernetes** | `k8s/base/{website,website-bot}.yaml` | - |
| **Docker Compose** | `docker-compose.yaml` | - |
| **Documentation** | `website/README.md`, `website-bot/README.md` | - |

## Next Steps

1. **Monitor**: Check Dash0 dashboard for real-time metrics
2. **Experiment**: Try different bot configurations
3. **Analyze**: View traces and logs for each request
4. **Optimize**: Identify bottlenecks and improvements
5. **Scale**: Increase load gradually to test limits

## Useful Commands

```bash
# View all services status
docker-compose ps

# Tail all logs
docker-compose logs -f

# Rebuild a specific service
docker-compose up -d --build willful-waste-website

# Execute command in container
docker-compose exec willful-waste-bot npm start

# View resource usage
docker stats

# Kubernetes equivalents
kubectl get all -n apollo-dash0-demo
kubectl logs -f deployment/willful-waste-website -n apollo-dash0-demo
kubectl exec -it pod/willful-waste-bot-xxx -- sh
kubectl describe pod <pod-name> -n apollo-dash0-demo
```

## Support

For issues with:

- **Website**: See [website/README.md](./website/README.md)
- **Bot**: See [website-bot/README.md](./website-bot/README.md)
- **GraphQL/Router**: Check Apollo Router documentation
- **Dash0**: Visit https://docs.dash0.com

## Architecture Files Created

```
project/
├── website/                    # React frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── queries.ts
│   │   ├── index.css
│   │   └── components/
│   │       ├── ProductCard.tsx
│   │       └── InventoryModal.tsx
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── .env.example
│   └── README.md
│
├── website-bot/               # Traffic generation bot
│   ├── bot.js
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── k8s/base/
│   ├── website.yaml          # Kubernetes deployment
│   ├── website-bot.yaml      # Kubernetes deployment
│   └── kustomization.yaml    # Updated with new services
│
├── docker-compose.yaml       # Updated with new services
└── WILLFUL_WASTE_SETUP.md   # This file
```

Enjoy running your Willful Waste demo! 🛍️
