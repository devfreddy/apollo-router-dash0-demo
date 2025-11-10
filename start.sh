#!/bin/bash

# Apollo Router Demo - Deployment Guide
#
# This project has been reorganized into two clear deployment paths.
# Please use one of the following instead:
#
# For Docker Compose (recommended for local development):
#   cd docker-compose && ./start.sh
#
# For Kubernetes (k3d):
#   cd kubernetes && ./start.sh
#
# See README.md for more details.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Apollo Router Demo - Deployment Paths                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}This project now has two clear deployment paths:${NC}"
echo ""

echo -e "${GREEN}1. Docker Compose (Local Development)${NC}"
echo -e "   Time: ~1-2 minutes | Complexity: Low"
echo -e "   ${BLUE}cd docker-compose && ./start.sh${NC}"
echo ""

echo -e "${GREEN}2. Kubernetes k3d (Production-like)${NC}"
echo -e "   Time: ~5-10 minutes | Complexity: Medium"
echo -e "   ${BLUE}cd kubernetes && ./start.sh${NC}"
echo ""

echo -e "${YELLOW}Documentation:${NC}"
echo -e "  - Compose: ${BLUE}docker-compose/README.md${NC}"
echo -e "  - Kubernetes: ${BLUE}kubernetes/README-DEPLOYMENT.md${NC}"
echo -e "  - Main: ${BLUE}README.md${NC}"
echo ""
