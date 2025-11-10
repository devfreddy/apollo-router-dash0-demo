#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - Start k3d Cluster
# This script checks for Docker Desktop or Colima, starts one if needed,
# and brings up the k3d cluster

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Apollo Router + Dash0 - Start Cluster ===${NC}"
echo ""

# Function to check if Docker Desktop is running
is_docker_desktop_running() {
    docker ps > /dev/null 2>&1
    return $?
}

# Function to check if Colima is running
is_colima_running() {
    if ! command -v colima &> /dev/null; then
        return 1
    fi
    colima status > /dev/null 2>&1
    return $?
}

# Function to start Docker Desktop (macOS)
start_docker_desktop() {
    echo -e "${YELLOW}Starting Docker Desktop...${NC}"

    if [ "$(uname)" != "Darwin" ]; then
        echo -e "${RED}Docker Desktop can only be auto-started on macOS.${NC}"
        echo -e "${YELLOW}Please start Docker Desktop manually.${NC}"
        return 1
    fi

    # Check if Docker Desktop is installed
    if [ ! -d "/Applications/Docker.app" ]; then
        echo -e "${RED}Docker Desktop not found at /Applications/Docker.app${NC}"
        echo -e "${YELLOW}Please install Docker Desktop: https://www.docker.com/products/docker-desktop${NC}"
        return 1
    fi

    open -a Docker

    # Wait for Docker to start (up to 60 seconds)
    echo -e "${YELLOW}Waiting for Docker Desktop to start...${NC}"
    for i in {1..60}; do
        if is_docker_desktop_running; then
            echo -e "${GREEN}Docker Desktop started successfully!${NC}"
            sleep 2
            return 0
        fi
        echo -n "."
        sleep 1
    done

    echo ""
    echo -e "${RED}Docker Desktop failed to start within 60 seconds.${NC}"
    return 1
}

# Function to start Colima
start_colima() {
    echo -e "${YELLOW}Starting Colima...${NC}"

    if ! command -v colima &> /dev/null; then
        echo -e "${RED}Colima not found. Please install it first.${NC}"
        return 1
    fi

    colima start

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Colima started successfully!${NC}"
        return 0
    else
        echo -e "${RED}Failed to start Colima.${NC}"
        return 1
    fi
}

# Check for Docker availability
echo -e "${BLUE}Checking Docker availability...${NC}"

if is_docker_desktop_running; then
    echo -e "${GREEN}✓ Docker Desktop is running${NC}"
elif is_colima_running; then
    echo -e "${GREEN}✓ Colima is running${NC}"
else
    echo -e "${YELLOW}⚠ No Docker runtime detected${NC}"
    echo ""

    # Detect which one to start
    if [ "$(uname)" = "Darwin" ]; then
        # macOS - prefer Docker Desktop if installed
        if [ -d "/Applications/Docker.app" ]; then
            echo -e "${YELLOW}Attempting to start Docker Desktop...${NC}"
            if ! start_docker_desktop; then
                echo -e "${YELLOW}Docker Desktop failed. Trying Colima...${NC}"
                if ! start_colima; then
                    echo -e "${RED}Failed to start Docker. Please start Docker Desktop or Colima manually.${NC}"
                    exit 1
                fi
            fi
        elif command -v colima &> /dev/null; then
            echo -e "${YELLOW}Docker Desktop not found. Starting Colima...${NC}"
            if ! start_colima; then
                echo -e "${RED}Failed to start Colima. Please start Docker manually.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}Neither Docker Desktop nor Colima found.${NC}"
            echo -e "${YELLOW}Please install Docker Desktop (https://www.docker.com/products/docker-desktop)${NC}"
            echo -e "${YELLOW}or Colima (https://github.com/abiosoft/colima)${NC}"
            exit 1
        fi
    else
        # Linux - just alert user
        echo -e "${RED}Docker not running. Please start Docker and try again.${NC}"
        exit 1
    fi
fi

echo ""

# Verify Docker is working
echo -e "${BLUE}Verifying Docker installation...${NC}"
if docker --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker is available: $(docker --version)${NC}"
else
    echo -e "${RED}Docker verification failed. Please check your Docker installation.${NC}"
    exit 1
fi

echo ""

# Check if k3d cluster exists
CLUSTER_NAME="apollo-dash0-demo"
echo -e "${BLUE}Checking k3d cluster status...${NC}"

if k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo -e "${GREEN}✓ Cluster '$CLUSTER_NAME' already exists${NC}"

    # Try to start the cluster if it's stopped
    if ! kubectl cluster-info > /dev/null 2>&1; then
        echo -e "${YELLOW}Cluster exists but is not running. Starting it...${NC}"
        k3d cluster start "$CLUSTER_NAME"
        echo -e "${GREEN}Cluster started successfully!${NC}"
    else
        echo -e "${GREEN}✓ Cluster is already running${NC}"
    fi
else
    echo -e "${YELLOW}Cluster does not exist. Running full setup...${NC}"
    echo ""

    # Run the full k3d-up.sh script
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

    cd "$PROJECT_ROOT"
    bash kubernetes/scripts/k3d-up.sh
    exit $?
fi

echo ""
echo -e "${GREEN}=== Cluster Ready ===${NC}"
echo ""
echo -e "${GREEN}Apollo Router is accessible at:${NC}"
echo -e "  GraphQL API:  ${YELLOW}http://localhost:4000${NC}"
echo -e "  Health Check: ${YELLOW}http://localhost:8088/health${NC}"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo -e "  kubectl get pods -n apollo-dash0-demo"
echo -e "  kubectl logs -f deployment/apollo-router -n apollo-dash0-demo"
echo ""
