#!/bin/bash

# Apollo Router Demo - Stop Guide
#
# Please stop your services using the deployment-specific scripts:
#
# For Docker Compose:
#   cd docker-compose && ./stop.sh
#
# For Kubernetes:
#   cd kubernetes && ./stop.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Apollo Router Demo - Stop Services                      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Stop using the deployment-specific scripts:${NC}"
echo ""

echo -e "${GREEN}Docker Compose:${NC}"
echo -e "  ${BLUE}cd docker-compose && ./stop.sh${NC}"
echo ""

echo -e "${GREEN}Kubernetes:${NC}"
echo -e "  ${BLUE}cd kubernetes && ./stop.sh${NC}"
echo ""
