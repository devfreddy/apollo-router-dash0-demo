# 🚀 START HERE - Willful Waste Retail Store

Welcome! This document will get you started with the Willful Waste retail store in under 5 minutes.

## ⚡ Quick Start (Choose One)

### Option 1: Automated Setup (Easiest) ⭐
```bash
# From anywhere in the project
./WILLFUL_WASTE_QUICKSTART.sh

# Wait ~60 seconds...
# Then open: http://localhost:3000
```

### Option 2: Docker Compose
```bash
# From project root
docker-compose up -d

# Wait ~30 seconds...
# Then open: http://localhost:3000
```

### Option 3: Local Development
```bash
cd website
npm install
npm run dev

# Automatically opens: http://localhost:3000
```

### Option 4: Kubernetes
```bash
# From project root
./kubernetes/scripts/k3d-up.sh

# Wait ~2-5 minutes...
# Then:
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80
# Open: http://localhost:3000
```

## 🎯 What to Do Next

1. **Website is now running** at http://localhost:3000
2. **Explore the interface**:
   - Browse products in the grid
   - Click "Details" button on any product
   - View inventory information in the modal
   - Notice real-time data from GraphQL

3. **Start the bot** (for load testing):
   ```bash
   docker-compose --profile bot up -d
   ```

4. **Monitor in Dash0**:
   - Go to https://app.dash0.com
   - Select dataset from `.env` (default: `apollo-router-demo`)
   - Look for service: `willful-waste-website`
   - Watch real-time metrics as bot generates traffic

## 📚 Where to Find Documentation

**Quick Commands?** → See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

**Full Setup Guide?** → See [WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md)

**Website Development?** → See [README.md](./README.md)

**Architecture Details?** → See [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md)

**Everything Else?** → See [INDEX.md](./INDEX.md) (Master Documentation Index)

## 🎨 What You're Looking At

The website is built with:
- **React** + **TypeScript** - Modern web framework
- **Apollo Client** - GraphQL data fetching
- **Vite** - Super-fast build tool
- **Dash0 RUM** - Web performance monitoring

It connects to:
- **Apollo Router** (port 4000) - GraphQL gateway
- **4 Subgraphs** - Products, Reviews, Accounts, Inventory

## 🤖 The Bot Explained

There's also an automated bot that:
- **Simulates users** browsing the website
- **Makes GraphQL queries** directly to the API
- **Generates realistic traffic** for testing
- **Can be scaled up** for load testing

Start it with:
```bash
docker-compose --profile bot up -d
```

## 📊 Monitor Your Stack

**Real-time metrics**: https://app.dash0.com
- Request rate
- Response times
- Error rates
- Web performance (RUM)

**Local logs**:
```bash
# Website logs
docker-compose logs -f willful-waste-website

# Bot logs
docker-compose logs -f willful-waste-bot

# All logs
docker-compose logs -f
```

## 🆘 Something Not Working?

### Website shows "Error loading products"
```bash
# Check if GraphQL is accessible
curl http://localhost:4000/graphql

# Check website logs
docker-compose logs willful-waste-website
```

### Port already in use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
docker run -p 3001:3000 apollo-dash0-demo-willful-waste-website:latest
```

### Docker Compose not found
```bash
# Update Docker Desktop or install separately
brew install docker-compose  # Mac
# or
apt-get install docker-compose  # Linux
```

## 💡 Pro Tips

1. **Always start from project root** - Most commands expect to be run there
2. **Use the quickstart script** - It checks prerequisites for you
3. **Monitor Dash0 while testing** - You'll see real-time metrics
4. **Scale the bot gradually** - Start with 2 bots, then increase
5. **Use `docker-compose logs`** - Most issues are in the logs

## 🔗 Key Links

| Resource | URL |
|----------|-----|
| Website | http://localhost:3000 |
| GraphQL Endpoint | http://localhost:4000/graphql |
| Dash0 Dashboard | https://app.dash0.com |
| Apollo Router Health | http://localhost:8088/health |
| Project Root | `../` |

## 📁 File Organization

```
website/
├── START_HERE.md                    ← You are here
├── INDEX.md                         ← Master documentation index
├── README.md                        ← Website dev guide
├── WILLFUL_WASTE_SETUP.md          ← Complete setup guide
├── WILLFUL_WASTE_SUMMARY.md        ← Project overview
├── QUICK_REFERENCE.md              ← Command cheat sheet
├── IMPLEMENTATION_DETAILS.md       ← Technical details
├── WILLFUL_WASTE_QUICKSTART.sh    ← Automated setup
├── src/                            ← React source code
├── Dockerfile                      ← Docker image
├── package.json                    ← Dependencies
└── ...
```

## ✅ Success Checklist

- [ ] Website loads at http://localhost:3000
- [ ] Products display on the page
- [ ] Can click "Details" and see inventory
- [ ] No console errors
- [ ] Dash0 shows metrics

## 🎓 Next Level Learning

**Want to understand more?**
1. Read [INDEX.md](./INDEX.md) for an overview
2. Explore [WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md) for details
3. Check [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md) for architecture

**Want to develop the website?**
1. See [README.md](./README.md) for dev instructions
2. Edit `src/` files and use `npm run dev`
3. Changes auto-reload in browser

**Want to test at scale?**
1. See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for bot commands
2. Read [../website-bot/README.md](../website-bot/README.md) for details
3. Scale bot replicas: `kubectl scale deployment willful-waste-bot --replicas=10`

## 🎉 You're All Set!

Your Willful Waste demo is running and ready to explore!

**Questions?** Check [INDEX.md](./INDEX.md) for the complete documentation.

---

**Next Steps**:
1. Open http://localhost:3000
2. Browse some products
3. Read the relevant documentation for what you want to do
4. Start the bot: `docker-compose --profile bot up -d`
5. Monitor in Dash0: https://app.dash0.com

Enjoy! 🛍️
