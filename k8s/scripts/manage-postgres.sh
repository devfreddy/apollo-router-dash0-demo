#!/bin/bash
set -e

# PostgreSQL Cluster Management Script
# This script provides utilities for managing the PostgreSQL cluster

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="apollo-dash0-demo"
CLUSTER_NAME="inventory-db"

# Function to print usage
print_usage() {
    echo -e "${BLUE}PostgreSQL Cluster Management${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status          - Show cluster status"
    echo "  logs            - Show database logs"
    echo "  connect         - Connect to database (requires psql)"
    echo "  port-forward    - Port forward database to localhost:5432"
    echo "  backup          - Trigger backup (if configured)"
    echo "  restart         - Restart the database cluster"
    echo "  reset-data      - Delete cluster and reinitialize (WARNING: DATA LOSS)"
    echo "  help            - Show this help message"
    echo ""
}

# Function to show cluster status
show_status() {
    echo -e "${BLUE}PostgreSQL Cluster Status${NC}"
    echo ""

    echo -e "${GREEN}Cluster Status:${NC}"
    kubectl get cluster $CLUSTER_NAME -n $NAMESPACE 2>/dev/null || echo "  Cluster not found"
    echo ""

    echo -e "${GREEN}Pod Status:${NC}"
    kubectl get pods -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME || echo "  No pods found"
    echo ""

    echo -e "${GREEN}Service Status:${NC}"
    kubectl get svc -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME || echo "  No services found"
    echo ""

    echo -e "${GREEN}Cluster Details:${NC}"
    kubectl describe cluster $CLUSTER_NAME -n $NAMESPACE 2>/dev/null | grep -A 20 "Status:" || echo "  Status not available"
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}PostgreSQL Cluster Logs${NC}"
    echo ""

    POD=$(kubectl get pods -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$POD" ]; then
        echo -e "${RED}Error: No database pods found${NC}"
        exit 1
    fi

    echo -e "${GREEN}Following logs from pod: $POD${NC}"
    echo "  (Press Ctrl+C to exit)"
    echo ""

    kubectl logs -f pod/$POD -n $NAMESPACE
}

# Function to connect to database
connect_db() {
    echo -e "${BLUE}Connecting to PostgreSQL Database${NC}"
    echo ""

    POD=$(kubectl get pods -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)

    if [ -z "$POD" ]; then
        echo -e "${RED}Error: No database pods found${NC}"
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}psql not found. Using kubectl exec instead...${NC}"
        echo ""
        kubectl exec -it pod/$POD -n $NAMESPACE -- psql -U inventory_user -d inventory_db
    else
        echo -e "${GREEN}Starting port forward in background...${NC}"

        # Kill any existing port forwards
        pkill -f "kubectl port-forward.*5432" || true

        kubectl port-forward -n $NAMESPACE svc/$CLUSTER_NAME-rw 5432:5432 &
        PORT_FORWARD_PID=$!

        sleep 2

        echo -e "${GREEN}Connecting to database at localhost:5432${NC}"
        psql -h localhost -U inventory_user -d inventory_db

        # Kill port forward when done
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
}

# Function to start port forward
port_forward() {
    echo -e "${BLUE}Port Forwarding PostgreSQL to localhost:5432${NC}"
    echo ""
    echo -e "${GREEN}Starting port forward...${NC}"
    echo -e "${YELLOW}Access database at: localhost:5432${NC}"
    echo -e "${YELLOW}Username: inventory_user${NC}"
    echo -e "${YELLOW}Database: inventory_db${NC}"
    echo ""
    echo "Press Ctrl+C to stop"
    echo ""

    kubectl port-forward -n $NAMESPACE svc/$CLUSTER_NAME-rw 5432:5432
}

# Function to restart cluster
restart_cluster() {
    echo -e "${BLUE}Restarting PostgreSQL Cluster${NC}"
    echo ""

    read -p "This will restart the database. Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 1
    fi

    echo -e "${YELLOW}Restarting cluster $CLUSTER_NAME...${NC}"
    kubectl delete pod -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME

    echo -e "${YELLOW}Waiting for pod to restart...${NC}"
    kubectl wait --for=condition=ready pod -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME --timeout=120s

    echo -e "${GREEN}✓ Cluster restarted${NC}"
}

# Function to reset data
reset_data() {
    echo -e "${RED}WARNING: This will DELETE all data in the database!${NC}"
    echo ""
    read -p "Type 'yes' to confirm data deletion: " confirm

    if [ "$confirm" != "yes" ]; then
        echo "Cancelled"
        exit 1
    fi

    echo -e "${YELLOW}Deleting PostgreSQL cluster...${NC}"
    kubectl delete cluster $CLUSTER_NAME -n $NAMESPACE

    echo -e "${YELLOW}Waiting for deletion...${NC}"
    sleep 5

    echo -e "${YELLOW}Redeploying PostgreSQL cluster...${NC}"
    kubectl apply -f k8s/base/postgres-cluster.yaml

    echo -e "${YELLOW}Waiting for cluster to be ready...${NC}"
    kubectl wait --for=condition=ready cluster/$CLUSTER_NAME -n $NAMESPACE --timeout=180s

    echo -e "${GREEN}✓ Database has been reset with fresh data${NC}"
}

# Parse command
COMMAND=${1:-help}

case $COMMAND in
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    connect)
        connect_db
        ;;
    port-forward)
        port_forward
        ;;
    restart)
        restart_cluster
        ;;
    reset-data)
        reset_data
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo ""
        print_usage
        exit 1
        ;;
esac
