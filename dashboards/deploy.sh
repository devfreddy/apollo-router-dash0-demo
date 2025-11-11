#!/bin/bash

# Deploy Apollo Router dashboard(s) to Dash0
# Usage: ./deploy.sh [filename]
#
# Examples:
#   ./deploy.sh                                    # Deploy default (apollo-router.json)
#   ./deploy.sh apollo-router.json                 # Deploy with all docs
#   ./deploy.sh apollo-router-no-docs.json         # Deploy without markdown docs
#   ./deploy.sh both                               # Deploy both versions

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

# Determine which dashboards to deploy
DASHBOARD_FILE="${1:-apollo-router.json}"
DASHBOARDS_TO_DEPLOY=()

if [ "$DASHBOARD_FILE" = "both" ]; then
  DASHBOARDS_TO_DEPLOY=("apollo-router.json" "apollo-router-no-docs.json")
else
  DASHBOARDS_TO_DEPLOY=("$DASHBOARD_FILE")
fi

# Deploy each dashboard
for dashboard_file in "${DASHBOARDS_TO_DEPLOY[@]}"; do
  FULL_PATH="dash0/apollo-router/${dashboard_file}"

  # Determine dashboard ID based on filename
  if [[ "$dashboard_file" == *"no-docs"* ]]; then
    DASHBOARD_ID="apollo-router-no-docs"
  else
    DASHBOARD_ID="apollo-router"
  fi

  API_URL="https://api.${DASH0_REGION}.aws.dash0.com/api/dashboards/${DASHBOARD_ID}?dataset=${DASH0_DATASET}"

  echo "🚀 Deploying ${dashboard_file} to Dash0..."
  echo "📍 Region: ${DASH0_REGION}"
  echo "📦 Dataset: ${DASH0_DATASET}"
  echo "📊 Dashboard: ${FULL_PATH}"

  # Check if dashboard file exists
  if [ ! -f "$FULL_PATH" ]; then
    echo "❌ Error: Dashboard file not found: $FULL_PATH"
    echo "Run 'npm run convert:all' first to generate both dashboards"
    exit 1
  fi

  # Deploy dashboard using PUT (creates or updates)
  RESPONSE=$(curl -sS -w "\n%{http_code}" \
    -X PUT \
    "${API_URL}" \
    -H "Authorization: Bearer ${DASH0_AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    -d @"${FULL_PATH}")

  # Extract HTTP status code
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ ${dashboard_file} deployed successfully!"
    echo "📊 Dashboard ID: ${DASHBOARD_ID}"
    echo "🔗 View in Dash0: https://app.dash0.com/dashboards/${DASHBOARD_ID}"
  else
    echo "❌ Failed to deploy ${dashboard_file} (HTTP ${HTTP_CODE})"
    echo "Response:"
    echo "$BODY" | jq '.' || echo "$BODY"
    exit 1
  fi

  echo ""
done

echo "✨ All done!"
