#!/bin/bash

set -e

# Get the project root directory
if [ -f "compose/docker-compose.yaml" ]; then
    PROJECT_ROOT="."
elif [ -f "../compose/docker-compose.yaml" ]; then
    PROJECT_ROOT=".."
else
    echo "Error: Could not find project root. Please run from project root or website/ directory."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🛍️  Willful Waste Retail Store - Quick Start Setup       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Check .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "\n${YELLOW}Creating .env file from .env.sample...${NC}"
    if [ -f "$PROJECT_ROOT/.env.sample" ]; then
        cp "$PROJECT_ROOT/.env.sample" "$PROJECT_ROOT/.env"
        echo -e "${GREEN}✓ .env file created${NC}"
        echo -e "${YELLOW}⚠️  Please update .env with your Dash0 credentials before proceeding${NC}"
    else
        echo -e "${RED}✗ .env.sample not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Change to project root for docker-compose commands
cd "$PROJECT_ROOT"

# Start services
echo -e "\n${YELLOW}Starting Willful Waste services...${NC}"
echo -e "${BLUE}Building and starting backend services (router, subgraphs)${NC}"

docker-compose up -d router accounts products-py reviews inventory

echo -e "${YELLOW}Waiting for backend services to be healthy...${NC}"
sleep 30

# Check if router is healthy
max_attempts=10
attempt=0
until docker-compose exec -T router curl -s http://localhost:8088/health > /dev/null 2>&1; do
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}✗ Router failed to start${NC}"
        docker-compose logs router
        exit 1
    fi
    echo -e "${YELLOW}  Waiting for router... (attempt $((attempt + 1))/$max_attempts)${NC}"
    sleep 5
    ((attempt++))
done
echo -e "${GREEN}✓ Backend services are healthy${NC}"

# Build and start website
echo -e "\n${BLUE}Building and starting Willful Waste website...${NC}"
docker-compose up -d willful-waste-website

# Check if website is healthy
echo -e "${YELLOW}Waiting for website to be ready...${NC}"
sleep 20

attempt=0
until docker-compose exec -T willful-waste-website wget -q -O- http://localhost:3000 > /dev/null 2>&1; do
    if [ $attempt -eq 10 ]; then
        echo -e "${RED}✗ Website failed to start${NC}"
        docker-compose logs willful-waste-website
        exit 1
    fi
    echo -e "${YELLOW}  Waiting for website... (attempt $((attempt + 1))/10)${NC}"
    sleep 5
    ((attempt++))
done
echo -e "${GREEN}✓ Website is running${NC}"

# Display summary
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Willful Waste services are ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

echo -e "\n${BLUE}Access Points:${NC}"
echo -e "  📱 Website:    ${YELLOW}http://localhost:3000${NC}"
echo -e "  🔧 GraphQL:    ${YELLOW}http://localhost:4000/graphql${NC}"
echo -e "  📊 Router:     ${YELLOW}http://localhost:4000${NC}"

echo -e "\n${BLUE}Subgraph Endpoints:${NC}"
echo -e "  👥 Accounts:   ${YELLOW}http://localhost:4001/graphql${NC}"
echo -e "  📦 Products:   ${YELLOW}http://localhost:4003/graphql${NC}"
echo -e "  ⭐ Reviews:    ${YELLOW}http://localhost:4002/graphql${NC}"
echo -e "  📦 Inventory:  ${YELLOW}http://localhost:4004/graphql${NC}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "  1. Open ${YELLOW}http://localhost:3000${NC} in your browser"
echo -e "  2. Browse products and view inventory details"
echo -e ""
echo -e "  To start the traffic bot:"
echo -e "  ${YELLOW}docker-compose --profile bot up -d${NC}"
echo -e ""
echo -e "  To view logs:"
echo -e "  ${YELLOW}docker-compose logs -f${NC}"
echo -e ""
echo -e "  To monitor in Dash0:"
echo -e "  1. Go to ${YELLOW}https://app.dash0.com${NC}"
echo -e "  2. Select your dataset: ${YELLOW}$(grep DASH0_DATASET .env | cut -d'=' -f2)${NC}"
echo -e "  3. Look for services: ${YELLOW}willful-waste-website${NC}, ${YELLOW}apollo-router${NC}"
echo -e ""
echo -e "  To stop all services:"
echo -e "  ${YELLOW}docker-compose down${NC}"

echo -e "\n${BLUE}📚 Documentation:${NC}"
echo -e "  Complete Setup: ${YELLOW}./WILLFUL_WASTE_SETUP.md${NC}"
echo -e "  Website Docs:   ${YELLOW}./website/README.md${NC}"
echo -e "  Bot Docs:       ${YELLOW}./website-bot/README.md${NC}"

echo ""
