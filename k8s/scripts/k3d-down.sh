#!/bin/bash
set -e

# Apollo Router + Dash0 Demo - k3d Teardown Script
# This script deletes the k3d cluster and cleans up resources

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Apollo Router + Dash0 k3d Teardown ===${NC}"

CLUSTER_NAME="apollo-dash0-demo"

# Check if cluster exists
if ! k3d cluster list | grep -q "$CLUSTER_NAME"; then
    echo -e "${RED}Cluster '$CLUSTER_NAME' does not exist.${NC}"
    exit 0
fi

# Confirm deletion
read -p "Are you sure you want to delete the cluster '$CLUSTER_NAME'? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Delete cluster
echo -e "${GREEN}Deleting k3d cluster: $CLUSTER_NAME${NC}"
k3d cluster delete "$CLUSTER_NAME"

echo -e "${GREEN}Cluster deleted successfully!${NC}"
echo ""
echo -e "${GREEN}To redeploy, run:${NC}"
echo -e "  ./k8s/scripts/k3d-up.sh"
