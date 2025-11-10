#!/bin/bash

# Script to compose the supergraph schema from running subgraphs
# Requires: Apollo Rover CLI (https://www.apollographql.com/docs/rover/getting-started)

set -e

echo "🚀 Composing supergraph schema..."

# Check if rover is installed
if ! command -v rover &> /dev/null; then
    echo "❌ Error: Apollo Rover CLI is not installed."
    echo "Install it with: curl -sSL https://rover.apollo.dev/nix/latest | sh"
    exit 1
fi

# Check if subgraphs are running
echo "📡 Checking if subgraphs are running..."

SUBGRAPHS=("accounts:4001" "products:4003" "reviews:4002" "inventory:4004")
for subgraph in "${SUBGRAPHS[@]}"; do
    IFS=':' read -r name port <<< "$subgraph"
    if ! curl -s -f "http://localhost:${port}/.well-known/apollo/server-health" > /dev/null 2>&1; then
        echo "⚠️  Warning: ${name} subgraph not reachable on port ${port}"
        echo "   Make sure Docker containers are running: docker compose up -d"
    else
        echo "✅ ${name} subgraph is running"
    fi
done

echo ""
echo "🔨 Running Rover composition..."

# Compose the supergraph using Rover
rover supergraph compose \
    --config ./router/supergraph-config.yaml \
    --output ./router/supergraph.graphql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Supergraph schema successfully composed!"
    echo "   Output: ./router/supergraph.graphql"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Review the generated supergraph schema"
    echo "   2. Restart the router: docker compose restart router"
    echo "   3. Access Apollo Sandbox: http://localhost:4000"
else
    echo ""
    echo "❌ Error: Failed to compose supergraph schema"
    echo "   Check the error messages above for details"
    exit 1
fi
