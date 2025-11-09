#!/bin/bash

set -e

# Apollo Router + Dash0 Demo - Unified Start Script
# Usage: ./start.sh [compose|k8s]
# Default: k8s (Kubernetes)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to k8s if no argument provided
DEPLOYMENT_MODE="${1:-k8s}"

# Validate argument
if [[ ! "$DEPLOYMENT_MODE" =~ ^(compose|k8s)$ ]]; then
    echo -e "${RED}Invalid deployment mode: $DEPLOYMENT_MODE${NC}"
    echo ""
    echo "Usage: ./start.sh [compose|k8s]"
    echo ""
    echo "  compose  - Start Docker Compose deployment"
    echo "  k8s      - Start Kubernetes (k3d) deployment [DEFAULT]"
    echo ""
    exit 1
fi

if [[ "$DEPLOYMENT_MODE" == "compose" ]]; then
    echo -e "${BLUE}=== Starting Docker Compose Deployment ===${NC}"
    echo ""

    # Check if k3d is running and optionally stop it
    if command -v k3d &> /dev/null && k3d cluster list 2>/dev/null | grep -q "apollo-dash0-demo"; then
        echo -e "${YELLOW}k3d cluster detected. Stopping it...${NC}"
        read -p "Stop k3d cluster? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./k8s/scripts/k3d-down.sh
        fi
    fi

    # Start Docker Compose
    echo -e "${GREEN}Starting Docker Compose services...${NC}"
    docker compose up -d

    echo ""
    echo -e "${GREEN}✓ Docker Compose deployment started!${NC}"
    echo ""
    echo -e "Services:"
    docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo -e "GraphQL API: ${YELLOW}http://localhost:4000${NC}"
    echo ""

else
    # k8s mode (default)
    echo -e "${BLUE}=== Starting Kubernetes (k3d) Deployment ===${NC}"
    echo ""

    # Check if Docker Compose is running and stop it
    if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo"; then
        echo -e "${YELLOW}Docker Compose services detected. Stopping them...${NC}"
        docker compose down
        echo ""
    fi

    # Start k3d deployment
    echo -e "${GREEN}Starting k3d cluster...${NC}"
    ./k8s/scripts/start-cluster.sh

    echo ""
    echo -e "${GREEN}✓ Kubernetes deployment started!${NC}"
    echo ""
fi
