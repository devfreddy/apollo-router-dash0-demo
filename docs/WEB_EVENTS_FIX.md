# Web Events Fix: Apollo Router Endpoint Issue

## Issue
Bot and website couldn't reach GraphQL endpoint, preventing web events from appearing in Dash0.

## Root Cause
Apollo Router v2.8.0 requires GraphQL requests at **root path `/`**, not `/graphql`:
- ❌ `http://apollo-router:4000/graphql` → 404 Not Found
- ✅ `http://apollo-router:4000/` → Works

## Changes Made
1. `kubernetes/base/website-bot.yaml` - Bot `GRAPHQL_URL: "http://apollo-router:4000/"`
2. `shared/website/src/main.tsx` - Website Apollo client URI to root path
3. `kubernetes/scripts/k3d-up.sh` - Build arg updated for website image

## Verification
```bash
# Bot now makes successful queries
kubectl logs deployment/willful-waste-bot -n apollo-dash0-demo | grep successful

# Diagnostic tool
./kubernetes/scripts/diagnose-web-events.sh
```

## Fresh Deploy
```bash
./kubernetes/scripts/k3d-down.sh
./kubernetes/start.sh
```

## Troubleshooting
See `docs/TROUBLESHOOTING_WEB_EVENTS.md` for detailed diagnostics and common issues.
