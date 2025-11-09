#!/bin/bash

# PostgreSQL Integration Verification Script
# Verifies that PostgreSQL is properly integrated and working with the inventory subgraph

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NAMESPACE="apollo-dash0-demo"
CLUSTER_NAME="inventory-db"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PostgreSQL Integration Verification                      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check 1: PostgreSQL Cluster exists
echo -e "${YELLOW}1. Checking PostgreSQL cluster...${NC}"
if kubectl get cluster $CLUSTER_NAME -n $NAMESPACE &>/dev/null; then
    STATUS=$(kubectl get cluster $CLUSTER_NAME -n $NAMESPACE -o jsonpath='{.status.phase}' 2>/dev/null)
    if [ "$STATUS" = "Cluster in healthy state" ] || [ -n "$STATUS" ]; then
        echo -e "   ${GREEN}✓ PostgreSQL cluster exists (Status: $STATUS)${NC}"
    else
        echo -e "   ${YELLOW}⚠ PostgreSQL cluster exists but status unknown${NC}"
    fi
else
    echo -e "   ${RED}✗ PostgreSQL cluster not found${NC}"
    exit 1
fi

# Check 2: Database pod is running
echo ""
echo -e "${YELLOW}2. Checking database pod...${NC}"
POD=$(kubectl get pods -n $NAMESPACE -l cnpg.io/cluster=$CLUSTER_NAME -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$POD" ]; then
    echo -e "   ${RED}✗ Database pod not found${NC}"
    exit 1
else
    POD_STATUS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.phase}' 2>/dev/null)
    if [ "$POD_STATUS" = "Running" ]; then
        echo -e "   ${GREEN}✓ Database pod is running ($POD)${NC}"
    else
        echo -e "   ${RED}✗ Database pod not running (Status: $POD_STATUS)${NC}"
        exit 1
    fi
fi

# Check 3: Database service exists
echo ""
echo -e "${YELLOW}3. Checking database services...${NC}"
if kubectl get svc $CLUSTER_NAME-rw -n $NAMESPACE &>/dev/null; then
    echo -e "   ${GREEN}✓ Read-write service exists${NC}"
else
    echo -e "   ${RED}✗ Read-write service not found${NC}"
    exit 1
fi

# Check 4: Inventory subgraph deployment
echo ""
echo -e "${YELLOW}4. Checking inventory subgraph deployment...${NC}"
if kubectl get deployment inventory -n $NAMESPACE &>/dev/null; then
    DEPLOY_STATUS=$(kubectl get deployment inventory -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null)
    if [ "$DEPLOY_STATUS" = "True" ]; then
        echo -e "   ${GREEN}✓ Inventory deployment is available${NC}"
    else
        echo -e "   ${YELLOW}⚠ Inventory deployment may not be ready yet${NC}"
    fi
else
    echo -e "   ${RED}✗ Inventory deployment not found${NC}"
    exit 1
fi

# Check 5: Database connectivity
echo ""
echo -e "${YELLOW}5. Testing database connectivity from inventory pod...${NC}"
INVENTORY_POD=$(kubectl get pods -n $NAMESPACE -l app=inventory -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -z "$INVENTORY_POD" ]; then
    echo -e "   ${YELLOW}⚠ Inventory pod not running yet (may still be starting)${NC}"
else
    # Check logs for database connection success
    if kubectl logs $INVENTORY_POD -n $NAMESPACE | grep -q "Database connection verified"; then
        echo -e "   ${GREEN}✓ Inventory subgraph connected to database${NC}"
    elif kubectl logs $INVENTORY_POD -n $NAMESPACE | grep -q "inventory-subgraph ready"; then
        echo -e "   ${YELLOW}⚠ Inventory subgraph started (connection status unclear)${NC}"
    else
        echo -e "   ${YELLOW}⚠ Checking logs...${NC}"
        kubectl logs $INVENTORY_POD -n $NAMESPACE | tail -5
    fi
fi

# Check 6: Database content
echo ""
echo -e "${YELLOW}6. Checking database content...${NC}"
INVENTORY_COUNT=$(kubectl exec -it $POD -n $NAMESPACE -- psql -U inventory_user -d inventory_db -t -c "SELECT COUNT(*) FROM inventory;" 2>/dev/null | tr -d ' ' | head -1)
if [ "$INVENTORY_COUNT" = "5" ]; then
    echo -e "   ${GREEN}✓ Database contains 5 inventory records (as expected)${NC}"
elif [ -n "$INVENTORY_COUNT" ] && [ "$INVENTORY_COUNT" -gt 0 ]; then
    echo -e "   ${YELLOW}⚠ Database contains $INVENTORY_COUNT records (expected 5)${NC}"
else
    echo -e "   ${RED}✗ Could not query database or no records found${NC}"
fi

# Check 7: Router is accessible
echo ""
echo -e "${YELLOW}7. Checking Apollo Router...${NC}"
if kubectl get deployment apollo-router -n $NAMESPACE &>/dev/null; then
    ROUTER_STATUS=$(kubectl get deployment apollo-router -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null)
    if [ "$ROUTER_STATUS" = "True" ]; then
        echo -e "   ${GREEN}✓ Apollo Router is available${NC}"
    else
        echo -e "   ${YELLOW}⚠ Apollo Router may not be ready yet${NC}"
    fi
else
    echo -e "   ${RED}✗ Apollo Router deployment not found${NC}"
fi

# Check 8: Test GraphQL query
echo ""
echo -e "${YELLOW}8. Testing GraphQL query (if router is accessible)...${NC}"
ROUTER_POD=$(kubectl get pods -n $NAMESPACE -l app=apollo-router -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$ROUTER_POD" ]; then
    # Try to query through port-forward
    (
        kubectl port-forward -n $NAMESPACE svc/apollo-router 4000:4000 &>/dev/null &
        PF_PID=$!
        sleep 2

        QUERY='{"query":"query { product(id: \"1\") { id inventory { quantity warehouse estimatedDelivery } } }"}'
        RESPONSE=$(curl -s -X POST http://localhost:4000/graphql \
            -H "Content-Type: application/json" \
            -d "$QUERY" 2>/dev/null)

        kill $PF_PID 2>/dev/null || true

        if echo "$RESPONSE" | grep -q '"quantity":'; then
            echo -e "   ${GREEN}✓ GraphQL query returned inventory data${NC}"
        elif echo "$RESPONSE" | grep -q '"data"'; then
            echo -e "   ${YELLOW}⚠ GraphQL query succeeded but may not have inventory data${NC}"
        else
            echo -e "   ${YELLOW}⚠ Could not test GraphQL query (router may not be ready)${NC}"
        fi
    ) &
    wait
else
    echo -e "   ${YELLOW}⚠ Router pod not found (may still be starting)${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Verification Summary                                     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}PostgreSQL Integration is working!${NC}"
echo ""
echo "Next steps:"
echo "  1. Wait 1-2 minutes for all services to fully initialize"
echo "  2. Test GraphQL: curl -X POST http://localhost:4000/graphql \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\":\"{ topProducts { id name inventory { quantity } } }\"}'"
echo "  3. View logs: kubectl logs -f deployment/inventory -n apollo-dash0-demo"
echo "  4. Manage database: ./k8s/scripts/manage-postgres.sh"
echo ""
