#!/bin/bash

# Apollo Router Demo - Kubernetes (k3d) Status Script
# Usage: ./status.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Kubernetes Cluster Status ===${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl not found${NC}"
    exit 1
fi

# Check cluster status
if kubectl cluster-info &> /dev/null; then
    echo -e "${GREEN}✓ Cluster is running${NC}"
    echo ""

    echo -e "${BLUE}Deployments:${NC}"
    kubectl get deployments -n apollo-dash0-demo || true

    echo ""
    echo -e "${BLUE}Pods:${NC}"
    kubectl get pods -n apollo-dash0-demo || true

    echo ""
    echo -e "${BLUE}Services:${NC}"
    kubectl get svc -n apollo-dash0-demo || true
else
    echo -e "${YELLOW}Cluster is not running${NC}"
fi

echo ""
