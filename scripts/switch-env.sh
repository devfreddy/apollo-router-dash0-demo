#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Environment Switcher
# Switch between Docker Compose and k3d deployments

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function show_usage() {
    echo -e "${BLUE}Apollo Router + Dash0 Demo - Environment Switcher${NC}"
    echo ""
    echo "Usage: $0 [compose|k3d|status]"
    echo ""
    echo "Commands:"
    echo "  compose  - Switch to Docker Compose deployment"
    echo "  k3d      - Switch to k3d (Kubernetes) deployment"
    echo "  status   - Show current deployment status"
    echo ""
    exit 1
}

function check_status() {
    echo -e "${BLUE}=== Deployment Status ===${NC}"
    echo ""

    # Check Docker Compose
    echo -e "${YELLOW}Docker Compose:${NC}"
    if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo-router"; then
        echo -e "  ${GREEN}✓ Running${NC}"
        docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"
    else
        echo -e "  ${RED}✗ Not running${NC}"
    fi
    echo ""

    # Check k3d
    echo -e "${YELLOW}k3d (Kubernetes):${NC}"
    if command -v k3d &> /dev/null && k3d cluster list 2>/dev/null | grep -q "apollo-dash0-demo"; then
        echo -e "  ${GREEN}✓ Cluster exists${NC}"
        kubectl get pods -n apollo-dash0-demo 2>/dev/null || echo "  Namespace not found"
    else
        echo -e "  ${RED}✗ Cluster not found${NC}"
    fi
    echo ""
}

function switch_to_compose() {
    echo -e "${GREEN}=== Switching to Docker Compose ===${NC}"

    # Check if k3d is running
    if command -v k3d &> /dev/null && k3d cluster list 2>/dev/null | grep -q "apollo-dash0-demo"; then
        echo -e "${YELLOW}k3d cluster detected. Stopping it...${NC}"
        read -p "Stop k3d cluster? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./k8s/scripts/k3d-down.sh
        fi
    fi

    echo -e "${GREEN}Starting Docker Compose...${NC}"
    docker compose up -d

    echo ""
    echo -e "${GREEN}Docker Compose deployment started!${NC}"
    echo -e "GraphQL API: ${YELLOW}http://localhost:4000${NC}"
    echo ""
}

function switch_to_k3d() {
    echo -e "${GREEN}=== Switching to k3d (Kubernetes) ===${NC}"

    # Check if Docker Compose is running
    if docker compose ps 2>/dev/null | grep -q "apollo-dash0-demo-router"; then
        echo -e "${YELLOW}Docker Compose services detected. Stopping them...${NC}"
        docker compose down
    fi

    echo -e "${GREEN}Starting k3d deployment...${NC}"
    ./k8s/scripts/k3d-up.sh
}

# Main script
case "${1:-}" in
    compose)
        switch_to_compose
        ;;
    k3d)
        switch_to_k3d
        ;;
    status)
        check_status
        ;;
    *)
        show_usage
        ;;
esac
