#!/bin/bash

# Apollo Router Demo - Status Guide
#
# Please check status using the deployment-specific scripts:
#
# For Docker Compose:
#   cd docker-compose && ./status.sh
#
# For Kubernetes:
#   cd kubernetes && ./status.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Apollo Router Demo - Check Status                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Check status using the deployment-specific scripts:${NC}"
echo ""

echo -e "${GREEN}Docker Compose:${NC}"
echo -e "  ${BLUE}cd docker-compose && ./status.sh${NC}"
echo ""

echo -e "${GREEN}Kubernetes:${NC}"
echo -e "  ${BLUE}cd kubernetes && ./status.sh${NC}"
echo ""
