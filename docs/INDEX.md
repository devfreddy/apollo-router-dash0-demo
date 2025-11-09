# 🛍️ Willful Waste Retail Store - Documentation Index

Welcome to the Willful Waste retail store documentation! This folder contains everything you need to understand, run, and develop the complete e-commerce demo application.

## 📚 Documentation Files

### 🚀 Getting Started

**[WILLFUL_WASTE_QUICKSTART.sh](./WILLFUL_WASTE_QUICKSTART.sh)** - Automated Setup Script
- One-command setup for the entire stack
- Checks prerequisites (Docker, Docker Compose)
- Starts backend services and waits for health checks
- Best way to get started if you're new
- Run: `./WILLFUL_WASTE_QUICKSTART.sh` from project root or website folder

**[WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md)** - Complete Setup Guide
- Detailed instructions for all deployment options
- Prerequisites and system requirements
- Step-by-step setup for Docker Compose, Kubernetes, and local development
- Troubleshooting guide with solutions
- Performance tuning recommendations
- Best read before deploying to production

### 📖 Core Documentation

**[README.md](./README.md)** - Website Overview
- Product features and functionality
- Project structure and file organization
- Installation and development instructions
- GraphQL query examples
- Troubleshooting website-specific issues
- Dash0 RUM integration details

**[WILLFUL_WASTE_SUMMARY.md](./WILLFUL_WASTE_SUMMARY.md)** - Project Overview
- High-level architecture and components
- Feature checklist
- Technology stack
- File structure summary
- Quick start instructions
- Next steps and support information

### 🔧 Technical Details

**[IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md)** - Deep Technical Dive
- Technology choices and rationale
- Component architecture and data flow
- Bot implementation strategies
- Integration points with existing services
- Kubernetes and Docker considerations
- Performance characteristics
- Security considerations
- Deployment checklist

**[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick Commands
- Common Docker Compose commands
- Kubernetes operations
- Bot configuration examples
- Monitoring and troubleshooting commands
- Environment variable reference
- Pro tips and best practices

## 🏗️ Project Structure

```
website/
├── src/                              # React source code
│   ├── components/
│   │   ├── ProductCard.tsx          # Product display component
│   │   └── InventoryModal.tsx       # Inventory details modal
│   ├── App.tsx                      # Main application
│   ├── main.tsx                     # Entry point with Apollo + Dash0
│   ├── queries.ts                   # GraphQL queries
│   ├── index.css                    # Global styles
│   └── App.css                      # App-specific styles
├── index.html                        # HTML template
├── Dockerfile                        # Docker image definition
├── package.json                      # Dependencies
├── vite.config.ts                    # Build configuration
├── tsconfig.json                     # TypeScript configuration
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore rules
├── README.md                         # Overview
├── INDEX.md                          # This file
│
├── WILLFUL_WASTE_QUICKSTART.sh      # Automated setup script
├── WILLFUL_WASTE_SETUP.md           # Complete setup guide
├── WILLFUL_WASTE_SUMMARY.md         # Project overview
├── IMPLEMENTATION_DETAILS.md        # Technical details
└── QUICK_REFERENCE.md               # Quick commands reference
```

## 🚀 Quick Start (30 seconds)

### Option 1: Automated Setup (Recommended)
```bash
# From project root
./WILLFUL_WASTE_QUICKSTART.sh

# Or from website folder
website/WILLFUL_WASTE_QUICKSTART.sh

# Then open browser
open http://localhost:3000
```

### Option 2: Manual Docker Compose
```bash
# From project root
docker-compose up -d

# Start with bot
docker-compose --profile bot up -d

# Access website
open http://localhost:3000
```

### Option 3: Kubernetes
```bash
# Full deployment
./k8s/scripts/k3d-up.sh

# Port forward
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80

# Access website
open http://localhost:3000
```

### Option 4: Local Development
```bash
cd website
npm install
npm run dev
# Opens http://localhost:3000 automatically
```

## 📋 Which Document Should I Read?

### "I just want to get it running"
👉 **[WILLFUL_WASTE_QUICKSTART.sh](./WILLFUL_WASTE_QUICKSTART.sh)** - Run the script!

### "I want to understand the setup"
👉 **[WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md)** - Complete guide with all options

### "I need commands quickly"
👉 **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Command cheat sheet

### "I'm developing on the website"
👉 **[README.md](./README.md)** - Website-specific documentation

### "I need to understand the architecture"
👉 **[IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md)** - Technical deep dive

### "I'm new to the project"
👉 **[WILLFUL_WASTE_SUMMARY.md](./WILLFUL_WASTE_SUMMARY.md)** - Overview

## 🎯 Common Tasks

### Start the Stack
```bash
./WILLFUL_WASTE_QUICKSTART.sh
```

### View Logs
```bash
# Docker Compose
docker-compose logs -f willful-waste-website

# Kubernetes
kubectl logs -f deployment/willful-waste-website -n apollo-dash0-demo
```

### Start Bot Traffic
```bash
docker-compose --profile bot up -d
# or
kubectl scale deployment willful-waste-bot --replicas=5 -n apollo-dash0-demo
```

### Monitor in Dash0
1. Go to https://app.dash0.com
2. Select your dataset from `.env`
3. Look for `willful-waste-website` service
4. View RUM metrics and traces

### Local Development
```bash
cd website
npm install
npm run dev
# Hot reload development server
```

### Build for Production
```bash
cd website
npm run build
# Output: dist/
```

## 🔧 Technology Stack

### Frontend
- React 18 with TypeScript
- Vite (build tool)
- Apollo Client (GraphQL)
- Dash0 RUM Agent
- Pure CSS (no frameworks)

### Backend
- Apollo Router (GraphQL Gateway)
- 4 Subgraphs (Products, Reviews, Accounts, Inventory)
- OpenTelemetry for traces
- Dash0 observability

### Bot
- Node.js
- Puppeteer (browser automation)
- Axios (HTTP client)

### Infrastructure
- Docker & Docker Compose
- Kubernetes (k3s)
- Kustomize

## 📊 Features

### Website
- ✅ Product catalog with GraphQL
- ✅ Real-time inventory display
- ✅ Responsive design
- ✅ Dash0 RUM monitoring
- ✅ Beautiful modern UI

### Bot
- ✅ Browser automation (Puppeteer)
- ✅ GraphQL API testing
- ✅ Realistic user behavior
- ✅ Multi-device simulation
- ✅ Configurable load

### Infrastructure
- ✅ Docker Compose deployment
- ✅ Kubernetes manifests
- ✅ Health checks
- ✅ Auto-scaling ready
- ✅ Full observability

## 🐛 Troubleshooting

See the troubleshooting sections in:
- **Website Issues**: [README.md - Troubleshooting](./README.md#troubleshooting)
- **Setup Issues**: [WILLFUL_WASTE_SETUP.md - Troubleshooting](./WILLFUL_WASTE_SETUP.md#troubleshooting)
- **Quick Answers**: [QUICK_REFERENCE.md - Troubleshooting](./QUICK_REFERENCE.md#-troubleshooting)

## 📝 Files Reference

| File | Purpose | Size |
|------|---------|------|
| `README.md` | Website overview | ~6KB |
| `INDEX.md` | Documentation index (this file) | ~5KB |
| `WILLFUL_WASTE_SETUP.md` | Complete setup guide | ~16KB |
| `WILLFUL_WASTE_SUMMARY.md` | Project overview | ~12KB |
| `QUICK_REFERENCE.md` | Command reference | ~7KB |
| `IMPLEMENTATION_DETAILS.md` | Technical deep dive | ~14KB |
| `WILLFUL_WASTE_QUICKSTART.sh` | Automated setup | ~5KB |

**Total Documentation**: ~65KB of comprehensive guides

## 🔗 Related Documentation

- **Bot Documentation**: [../website-bot/README.md](../website-bot/README.md)
- **Project Root**: [../](../)
- **Kubernetes Configs**: [../k8s/](../k8s/)

## 🎉 Next Steps

1. **Run quickstart**: `./WILLFUL_WASTE_QUICKSTART.sh`
2. **Open website**: http://localhost:3000
3. **Start bot**: `docker-compose --profile bot up -d`
4. **Monitor**: https://app.dash0.com
5. **Explore**: Browse products and check inventory
6. **Learn**: Read the documentation for deep understanding

## 💡 Pro Tips

- The quickstart script checks all prerequisites and provides helpful error messages
- Keep the documentation open while learning the architecture
- Use `QUICK_REFERENCE.md` for common commands
- Check logs early if something doesn't work
- Monitor in Dash0 while running the bot to see real-time metrics

## ❓ Questions?

- **Getting Started**: See WILLFUL_WASTE_SETUP.md
- **Commands**: See QUICK_REFERENCE.md
- **Architecture**: See IMPLEMENTATION_DETAILS.md
- **Website Dev**: See README.md
- **Bot Usage**: See ../website-bot/README.md

---

**Last Updated**: November 2024
**Status**: Production Ready ✅
**All Documentation**: Complete and organized in `website/` folder
