#!/bin/bash

set -e

# Apollo Router + Dash0 Demo - Unified Stop Script
# Usage: ./stop.sh [compose|k8s|all]
# Default: all (stops both if they're running)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

STOP_MODE="${1:-all}"

# Validate argument
if [[ ! "$STOP_MODE" =~ ^(compose|k8s|all)$ ]]; then
    echo -e "${RED}Invalid stop mode: $STOP_MODE${NC}"
    echo ""
    echo "Usage: ./stop.sh [compose|k8s|all]"
    echo ""
    echo "  compose  - Stop Docker Compose deployment"
    echo "  k8s      - Stop Kubernetes (k3d) deployment"
    echo "  all      - Stop both deployments [DEFAULT]"
    echo ""
    exit 1
fi

stop_compose() {
    if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo"; then
        echo -e "${YELLOW}Stopping Docker Compose services...${NC}"
        docker compose down
        echo -e "${GREEN}✓ Docker Compose stopped${NC}"
    else
        echo -e "${YELLOW}No Docker Compose services running${NC}"
    fi
}

stop_k8s() {
    if command -v k3d &> /dev/null && k3d cluster list 2>/dev/null | grep -q "apollo-dash0-demo"; then
        echo -e "${YELLOW}Stopping k3d cluster...${NC}"
        ./k8s/scripts/k3d-down.sh
        echo -e "${GREEN}✓ k3d cluster stopped${NC}"
    else
        echo -e "${YELLOW}No k3d cluster found${NC}"
    fi
}

echo -e "${BLUE}=== Stopping Apollo Router Demo ===${NC}"
echo ""

case "$STOP_MODE" in
    compose)
        stop_compose
        ;;
    k8s)
        stop_k8s
        ;;
    all)
        stop_compose
        echo ""
        stop_k8s
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
