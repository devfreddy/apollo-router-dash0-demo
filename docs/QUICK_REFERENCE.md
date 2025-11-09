# Willful Waste - Quick Reference Card

## 🚀 Quick Start (30 seconds)

```bash
# Run the automated setup
./WILLFUL_WASTE_QUICKSTART.sh

# Open in browser
open http://localhost:3000

# Start bot (optional)
docker-compose --profile bot up -d
```

## 📋 Common Commands

### Docker Compose

```bash
# Start everything
docker-compose up -d

# Start with bot
docker-compose --profile bot up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Rebuild services
docker-compose up -d --build
```

### Kubernetes

```bash
# Deploy everything
./k8s/scripts/k3d-up.sh

# Port forward website
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80

# View logs
kubectl logs -f deployment/willful-waste-website -n apollo-dash0-demo

# Scale bots
kubectl scale deployment willful-waste-bot --replicas=5 -n apollo-dash0-demo
```

### Local Development

```bash
# Website
cd website
npm install
npm run dev

# Bot
cd website-bot
npm install
npm start
```

## 🌐 Access Points

| Service | URL | Port |
|---------|-----|------|
| **Website** | http://localhost:3000 | 3000 |
| **GraphQL** | http://localhost:4000/graphql | 4000 |
| **Accounts** | http://localhost:4001/graphql | 4001 |
| **Products** | http://localhost:4003/graphql | 4003 |
| **Reviews** | http://localhost:4002/graphql | 4002 |
| **Inventory** | http://localhost:4004/graphql | 4004 |

## 🤖 Bot Configuration

```env
# Light Load (dev/testing)
CONCURRENT_BOTS=1
BOT_INTERVAL=15000
SESSION_DURATION=300000

# Medium Load (standard testing)
CONCURRENT_BOTS=3
BOT_INTERVAL=10000
SESSION_DURATION=600000

# Heavy Load (stress testing)
CONCURRENT_BOTS=10
BOT_INTERVAL=2000
SESSION_DURATION=1800000
```

## 📊 Monitoring

1. **Dash0 Dashboard**: https://app.dash0.com
2. **Dataset**: Check `.env` for `DASH0_DATASET` value
3. **Services to monitor**:
   - `willful-waste-website` (RUM metrics)
   - `apollo-router` (request rate, latency)
   - `apollo-dash0-demo` (infrastructure)

## 📁 File Structure

```
website/                 # React frontend
├── src/               # Source code
├── Dockerfile         # Docker image
└── README.md         # Detailed docs

website-bot/          # Traffic bot
├── bot.js            # Main bot code
├── Dockerfile        # Docker image
└── README.md         # Detailed docs

k8s/base/
├── website.yaml      # K8s deployment
├── website-bot.yaml  # K8s deployment
└── kustomization.yaml # K8s manifest

docker-compose.yaml   # Compose config
WILLFUL_WASTE_*.md   # Documentation
```

## 🐛 Troubleshooting

### Website shows "Error loading products"
```bash
# Check GraphQL endpoint
curl http://localhost:4000/graphql

# Check router logs
docker-compose logs router
```

### Bot not making requests
```bash
# Check bot logs
docker-compose logs willful-waste-bot

# Verify website is accessible
curl http://localhost:3000
```

### High memory usage
```bash
# Reduce concurrent bots
# Edit docker-compose.yaml or .env

CONCURRENT_BOTS=1
docker-compose up -d willful-waste-bot
```

### Kubernetes pods not starting
```bash
# Check pod status
kubectl get pods -n apollo-dash0-demo

# View pod events
kubectl describe pod <pod-name> -n apollo-dash0-demo

# Check logs
kubectl logs <pod-name> -n apollo-dash0-demo
```

## 📈 Performance Tuning

### For Lighter Load
```env
BOT_INTERVAL=20000      # 20 second delays
CONCURRENT_BOTS=1       # Single bot
SESSION_DURATION=300000 # 5 minute sessions
```

### For Heavier Load
```env
BOT_INTERVAL=1000       # 1 second delays
CONCURRENT_BOTS=10      # 10 concurrent bots
SESSION_DURATION=1800000 # 30 minute sessions
```

### For Best Performance
- Use Kubernetes (better scaling)
- Use bot profile: `--profile bot`
- Monitor in Dash0
- Start with 2-3 bots, increase gradually

## 🔍 GraphQL Query Examples

### Get All Products
```graphql
query {
  products {
    id name price category inStock
  }
}
```

### Get Product with Inventory
```graphql
query {
  products {
    id name price
    inventory {
      quantity warehouse estimatedDelivery
    }
  }
}
```

### Get Top 5 Products
```graphql
query {
  topProducts(limit: 5) {
    id name price category
  }
}
```

## 🛠️ Environment Variables

### Website
```env
VITE_GRAPHQL_URL=http://localhost:4000/graphql
VITE_DASH0_API_TOKEN=auth_xxxxx
VITE_ENVIRONMENT=demo
```

### Bot
```env
WEBSITE_URL=http://localhost:3000
GRAPHQL_URL=http://localhost:4000/graphql
BOT_INTERVAL=10000
SESSION_DURATION=300000
CONCURRENT_BOTS=2
HEADLESS=true
```

### Main Stack
```env
DASH0_AUTH_TOKEN=auth_xxxxx
DASH0_DATASET=apollo-router-demo
DASH0_METRICS_ENDPOINT=https://ingress.us-west-2.aws.dash0.com/v1/metrics
DASH0_TRACES_ENDPOINT=https://ingress.us-west-2.aws.dash0.com/v1/traces
```

## 📚 Documentation Links

- **Full Setup**: [WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md)
- **Summary**: [WILLFUL_WASTE_SUMMARY.md](./WILLFUL_WASTE_SUMMARY.md)
- **Technical Details**: [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md)
- **Website Docs**: [website/README.md](./website/README.md)
- **Bot Docs**: [website-bot/README.md](./website-bot/README.md)

## ⏱️ Typical Timings

| Action | Time |
|--------|------|
| Docker Compose startup | 30-60s |
| Website load | 5-10s |
| GraphQL query | 50-200ms |
| Page render | 100-500ms |
| Kubernetes deployment | 2-5 minutes |
| Bot setup | 10-20s |

## 🎯 Success Checklist

- [ ] Website loads at http://localhost:3000
- [ ] Products display with prices
- [ ] Inventory modal opens on click
- [ ] GraphQL queries work
- [ ] Bot making requests (check logs)
- [ ] Dash0 shows metrics
- [ ] No console errors

## 🚨 Emergency Stops

```bash
# Stop Docker Compose
docker-compose down

# Kill all bots
docker-compose kill willful-waste-bot

# Reset everything
docker-compose down -v
docker-compose up -d

# Kubernetes shutdown
kubectl delete namespace apollo-dash0-demo
```

## 💡 Pro Tips

1. **Use `--profile bot`** to include bot in Docker Compose
2. **Monitor in Dash0** while bot runs for real-time metrics
3. **Scale slowly** - start with 1-2 bots, increase gradually
4. **Check logs early** - helps with troubleshooting
5. **Use Kubernetes** for production and heavy load testing
6. **Set realistic intervals** - don't overwhelm with 0 delay
7. **Monitor resource usage** - watch Docker stats or `kubectl top pods`

## 🔗 Useful Links

- **Dash0 Dashboard**: https://app.dash0.com
- **Apollo Router Docs**: https://www.apollographql.com/router/
- **GraphQL Playground**: http://localhost:4000/graphql (in Apollo Router)
- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Docker Docs**: https://docs.docker.com/

## 📝 Notes

- All data is demo/test data (no real products)
- Bot uses public GraphQL API (no auth needed)
- RUM data sent securely to Dash0
- Services automatically restart on failure
- Changes to .env require service restart

---

**Last Updated**: November 2024
**Version**: 1.0
**Status**: Production Ready
