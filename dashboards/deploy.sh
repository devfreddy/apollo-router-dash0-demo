#!/bin/bash

# Deploy Apollo Router dashboard to Dash0
# Usage: ./deploy.sh

set -e

# Load environment variables
if [ ! -f ../.env ]; then
  echo "❌ Error: .env file not found"
  exit 1
fi

# Source the .env file
set -a
source ../.env
set +a

# Check required environment variables
if [ -z "$DASH0_AUTH_TOKEN" ]; then
  echo "❌ Error: DASH0_AUTH_TOKEN not set in .env"
  exit 1
fi

if [ -z "$DASH0_REGION" ]; then
  echo "❌ Error: DASH0_REGION not set in .env"
  exit 1
fi

if [ -z "$DASH0_DATASET" ]; then
  echo "❌ Error: DASH0_DATASET not set in .env"
  exit 1
fi

DASHBOARD_FILE="dash0/apollo-router/apollo-router.json"
DASHBOARD_ID="apollo-router"
API_URL="https://api.${DASH0_REGION}.aws.dash0.com/api/dashboards/${DASHBOARD_ID}?dataset=${DASH0_DATASET}"

echo "🚀 Deploying Apollo Router dashboard to Dash0..."
echo "📍 Region: ${DASH0_REGION}"
echo "📦 Dataset: ${DASH0_DATASET}"
echo "📊 Dashboard: ${DASHBOARD_FILE}"

# Check if dashboard file exists
if [ ! -f "$DASHBOARD_FILE" ]; then
  echo "❌ Error: Dashboard file not found: $DASHBOARD_FILE"
  echo "Run 'node convert.js' first to generate the dashboard"
  exit 1
fi

# Deploy dashboard using PUT (creates or updates)
RESPONSE=$(curl -sS -w "\n%{http_code}" \
  -X PUT \
  "${API_URL}" \
  -H "Authorization: Bearer ${DASH0_AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @"${DASHBOARD_FILE}")

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "✅ Dashboard deployed successfully!"
  echo "📊 Dashboard ID: ${DASHBOARD_ID}"
  echo "🔗 View in Dash0: https://app.dash0.com/dashboards/${DASHBOARD_ID}"
else
  echo "❌ Failed to deploy dashboard (HTTP ${HTTP_CODE})"
  echo "Response:"
  echo "$BODY" | jq '.' || echo "$BODY"
  exit 1
fi
