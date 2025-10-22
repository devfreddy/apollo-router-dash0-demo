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
    ./scripts/start-compose.sh
}

function switch_to_k3d() {
    ./scripts/start-k3d.sh
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
