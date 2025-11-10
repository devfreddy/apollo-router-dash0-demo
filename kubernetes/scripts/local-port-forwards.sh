#!/bin/bash
# Local Port Forward Manager
# This script manages kubectl port-forwards for local development access
# Usage: ./kubernetes/scripts/local-port-forwards.sh [start|stop|status]

set -e

NAMESPACE="apollo-dash0-demo"
PID_FILE="/tmp/k8s-port-forwards.pid"

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

start_forwards() {
    echo "Starting port forwards..."

    # Check if already running
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if kill -0 "$OLD_PID" 2>/dev/null; then
            echo -e "${YELLOW}✓ Port forwards already running (PID: $OLD_PID)${NC}"
            status_forwards
            return 0
        fi
    fi

    # Start port forwards in background
    (
        # GraphQL endpoint (Apollo Router) - only if service exists
        if kubectl get svc apollo-router -n "$NAMESPACE" &>/dev/null; then
            kubectl port-forward -n "$NAMESPACE" svc/apollo-router 4000:4000 &
        fi

        # Website (Willful Waste)
        kubectl port-forward -n "$NAMESPACE" svc/willful-waste-website 8080:8080 &

        # Wait for any to exit (shouldn't happen in normal operation)
        wait
    ) &

    sleep 2

    echo -e "${GREEN}✓ Port forwards started${NC}"
    status_forwards
}

stop_forwards() {
    if [ -f "$PID_FILE" ]; then
        PIDS=$(cat "$PID_FILE")
        echo "Stopping port forwards (PIDs: $PIDS)..."
        for pid in $PIDS; do
            kill "$pid" 2>/dev/null || true
        done
        rm -f "$PID_FILE"
        echo -e "${GREEN}✓ Port forwards stopped${NC}"
    else
        echo -e "${YELLOW}No port forwards running${NC}"
    fi
}

status_forwards() {
    echo ""
    echo "Local Development Endpoints:"
    echo -e "  ${GREEN}GraphQL API:${NC}   http://localhost:4000/graphql"
    echo -e "  ${GREEN}Website:${NC}       http://localhost:8080"
    echo ""
}

case "${1:-start}" in
    start)
        start_forwards
        ;;
    stop)
        stop_forwards
        ;;
    status)
        status_forwards
        ;;
    restart)
        stop_forwards
        sleep 1
        start_forwards
        ;;
    *)
        echo "Usage: $0 [start|stop|status|restart]"
        exit 1
        ;;
esac
