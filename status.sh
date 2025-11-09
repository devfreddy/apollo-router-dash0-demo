#!/bin/bash

# Apollo Router + Dash0 Demo - Unified Status Script
# Shows the status of both Docker Compose and Kubernetes deployments

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Apollo Router Demo - Deployment Status ===${NC}"
echo ""

# Check Docker Compose
echo -e "${YELLOW}Docker Compose:${NC}"
if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "  ${GREEN}✓ Running${NC}"
    echo ""
    docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
    echo ""
else
    echo -e "  ${RED}✗ Not running${NC}"
    echo ""
fi

# Check Kubernetes
echo -e "${YELLOW}Kubernetes (k3d):${NC}"
if command -v k3d &> /dev/null && k3d cluster list 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "  ${GREEN}✓ Cluster exists${NC}"
    echo ""
    if kubectl cluster-info &> /dev/null; then
        echo "  Pods:"
        kubectl get pods -n apollo-dash0-demo 2>/dev/null | tail -n +2 | while read -r line; do
            echo "    $line"
        done
        echo ""
    else
        echo -e "  ${YELLOW}Cluster exists but not accessible${NC}"
        echo ""
    fi
else
    echo -e "  ${RED}✗ Cluster not found${NC}"
    echo ""
fi

# Check endpoints
echo -e "${YELLOW}Endpoints:${NC}"

# Try Docker Compose first
if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo"; then
    echo -e "  Docker Compose GraphQL API: ${GREEN}http://localhost:4000${NC}"
fi

# Try k3d
if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null 2>&1; then
    ROUTER_IP=$(kubectl get svc -n apollo-dash0-demo apollo-router -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [ -n "$ROUTER_IP" ]; then
        echo -e "  Kubernetes GraphQL API: ${GREEN}http://$ROUTER_IP:4000${NC}"
    else
        echo -e "  Kubernetes: ${YELLOW}Port forward with: kubectl port-forward -n apollo-dash0-demo service/apollo-router 4000:4000${NC}"
    fi
fi

echo ""
