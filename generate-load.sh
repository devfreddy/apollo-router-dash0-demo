#!/bin/bash

# Simple load generation script for Apollo Router
# Sends continuous GraphQL requests to generate observability data

RATE=${1:-5}  # Requests per second (default: 5)
DURATION=${2:-60}  # Duration in seconds (default: 60)

echo "🔥 Starting load generation..."
echo "   Rate: ${RATE} req/sec"
echo "   Duration: ${DURATION} seconds"
echo ""

# GraphQL queries to cycle through
QUERIES=(
  '{"query": "{ topProducts(limit: 2) { name price reviews { rating body author { name } } inventory { quantity warehouse } } }"}'
  '{"query": "{ me { name username reviews { product { name } body } } }"}'
  '{"query": "{ products { name price category inStock } }"}'
  '{"query": "{ topProducts(limit: 3) { name inventory { quantity } } }"}'
)

START_TIME=$(date +%s)
END_TIME=$((START_TIME + DURATION))
REQUEST_COUNT=0

while [ $(date +%s) -lt $END_TIME ]; do
  # Pick a random query
  QUERY_INDEX=$((REQUEST_COUNT % ${#QUERIES[@]}))
  QUERY=${QUERIES[$QUERY_INDEX]}

  # Send request in background
  curl -s -X POST http://localhost:4000/ \
    -H "Content-Type: application/json" \
    -d "$QUERY" > /dev/null 2>&1 &

  REQUEST_COUNT=$((REQUEST_COUNT + 1))

  # Sleep to maintain rate
  sleep $(echo "scale=3; 1 / $RATE" | bc)

  # Print progress every 10 requests
  if [ $((REQUEST_COUNT % 10)) -eq 0 ]; then
    ELAPSED=$(($(date +%s) - START_TIME))
    echo "📊 Sent $REQUEST_COUNT requests in ${ELAPSED}s..."
  fi
done

echo ""
echo "✅ Load generation complete!"
echo "   Total requests: $REQUEST_COUNT"
echo "   Duration: $(($(date +%s) - START_TIME))s"
echo ""
echo "Check your Dash0 dashboard for metrics and traces!"
