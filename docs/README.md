# 📚 Documentation Hub

Welcome to the Apollo Router Dash0 Demo documentation. This folder contains comprehensive guides for the Willful Waste retail store project and related infrastructure.

## 🎯 Quick Navigation

### 🛍️ Willful Waste Retail Store (New!)

**Just getting started?**
- Start here: [START_HERE.md](./START_HERE.md) - 5 minute quick start

**Need complete setup instructions?**
- [WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md) - Full setup guide with all options

**Want quick commands?**
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Cheat sheet for common tasks

**Need architecture details?**
- [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md) - Technical deep dive

**Full documentation index?**
- [INDEX.md](./INDEX.md) - Master index of all docs

### 🚀 Automated Setup

**One-command setup script:**
- [WILLFUL_WASTE_QUICKSTART.sh](./WILLFUL_WASTE_QUICKSTART.sh) - Automated deployment

Run it with:
```bash
chmod +x docs/WILLFUL_WASTE_QUICKSTART.sh
./docs/WILLFUL_WASTE_QUICKSTART.sh
```

## 📋 File Guide

| File | Purpose | Read Time |
|------|---------|-----------|
| **START_HERE.md** | Quick start guide | 5 min |
| **WILLFUL_WASTE_SETUP.md** | Complete setup with all options | 20 min |
| **QUICK_REFERENCE.md** | Command cheat sheet | 5 min |
| **IMPLEMENTATION_DETAILS.md** | Technical architecture | 30 min |
| **INDEX.md** | Full documentation index | 10 min |
| **WILLFUL_WASTE_SUMMARY.md** | Project overview | 15 min |
| **WILLFUL_WASTE_QUICKSTART.sh** | Automated setup script | - |

## 🗂️ Project Structure

```
project-root/
├── docs/                         ← You are here
│   ├── START_HERE.md
│   ├── WILLFUL_WASTE_SETUP.md
│   ├── QUICK_REFERENCE.md
│   ├── INDEX.md
│   ├── IMPLEMENTATION_DETAILS.md
│   └── WILLFUL_WASTE_QUICKSTART.sh
│
├── website/                      ← React frontend
│   ├── src/
│   ├── Dockerfile
│   └── README.md
│
├── website-bot/                  ← Traffic bot
│   ├── bot.js
│   ├── Dockerfile
│   └── README.md
│
├── docker-compose.yaml          ← See header for doc refs
├── README.md                    ← See "Documentation" section
└── [rest of project]
```

## 🚀 Getting Started in 5 Steps

1. **Read this:** [START_HERE.md](./START_HERE.md)
2. **Run setup:** `./WILLFUL_WASTE_QUICKSTART.sh`
3. **Open website:** http://localhost:3000
4. **Start bot:** `docker-compose --profile bot up -d`
5. **Monitor:** https://app.dash0.com

## 🔗 External Documentation

- **Website Development:** [../website/README.md](../website/README.md)
- **Bot Documentation:** [../website-bot/README.md](../website-bot/README.md)
- **Main Project README:** [../README.md](../README.md)
- **Apollo Router Docs:** https://www.apollographql.com/router/
- **Dash0 Docs:** https://docs.dash0.com

## 📊 What's Covered

### Willful Waste Features
- ✅ React frontend with GraphQL
- ✅ Automated traffic bot
- ✅ Docker Compose deployment
- ✅ Kubernetes manifests
- ✅ Dash0 RUM integration
- ✅ Load testing capabilities

### Documentation Coverage
- ✅ Quick start guide
- ✅ Complete setup instructions
- ✅ Command reference
- ✅ Technical architecture
- ✅ Troubleshooting guides
- ✅ Performance tuning

## 🎯 Use Cases

### I want to...

**...get it running quickly**
→ [START_HERE.md](./START_HERE.md)

**...understand the full setup**
→ [WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md)

**...find a command**
→ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

**...understand the architecture**
→ [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md)

**...develop on the website**
→ [../website/README.md](../website/README.md)

**...use the bot for testing**
→ [../website-bot/README.md](../website-bot/README.md)

**...see everything**
→ [INDEX.md](./INDEX.md)

## 💡 Pro Tips

1. **Start with START_HERE.md** - It's designed for first-time users
2. **Use QUICK_REFERENCE.md** - Bookmark it for command lookups
3. **Check logs first** - Most issues are in the logs
4. **Monitor Dash0** - View metrics while testing
5. **Read docker-compose.yaml header** - It has documentation references

## ❓ FAQ

**Q: Which doc should I read first?**
A: [START_HERE.md](./START_HERE.md) - It takes 5 minutes and explains everything

**Q: How do I start the stack?**
A: Run `./WILLFUL_WASTE_QUICKSTART.sh` from the project root

**Q: Where are the quick commands?**
A: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common tasks and commands

**Q: How do I develop on the website?**
A: See [../website/README.md](../website/README.md)

**Q: How do I test with the bot?**
A: See [../website-bot/README.md](../website-bot/README.md)

## 🔍 Document Index

### Quick References
- [START_HERE.md](./START_HERE.md) - 5 minute quick start
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Command cheat sheet

### Comprehensive Guides
- [WILLFUL_WASTE_SETUP.md](./WILLFUL_WASTE_SETUP.md) - Complete setup guide
- [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md) - Technical details
- [WILLFUL_WASTE_SUMMARY.md](./WILLFUL_WASTE_SUMMARY.md) - Project overview

### Meta Documentation
- [INDEX.md](./INDEX.md) - Full documentation index
- [README.md](./README.md) - This file (documentation hub)

### Automated Tools
- [WILLFUL_WASTE_QUICKSTART.sh](./WILLFUL_WASTE_QUICKSTART.sh) - One-command setup

## 📞 Getting Help

**For most questions:** Start with [START_HERE.md](./START_HERE.md)

**For troubleshooting:** Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) "Troubleshooting" section

**For architecture:** Read [IMPLEMENTATION_DETAILS.md](./IMPLEMENTATION_DETAILS.md)

**For commands:** See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

## 📈 Next Steps

1. **Read**: [START_HERE.md](./START_HERE.md)
2. **Run**: `./WILLFUL_WASTE_QUICKSTART.sh`
3. **Explore**: http://localhost:3000
4. **Monitor**: https://app.dash0.com
5. **Learn**: Read relevant documentation

---

**Last Updated**: November 2024
**Status**: Complete and Production Ready ✅

Start with [START_HERE.md](./START_HERE.md) 🚀
