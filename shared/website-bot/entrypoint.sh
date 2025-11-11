#!/bin/bash
# Entrypoint script for Locust bot
# Uses environment variables from ConfigMap for dynamic configuration

# Default values
USERS=${LOCUST_USERS:-5}
SPAWN_RATE=${LOCUST_SPAWN_RATE:-1}
RUN_TIME=${LOCUST_RUN_TIME}  # Can be empty string (run forever)
HOST=${LOCUST_HOST:-http://apollo-router:4000}
HEADLESS=${LOCUST_HEADLESS:-true}

# Build Locust command
CMD="locust -f locustfile.py --host=$HOST --users=$USERS --spawn-rate=$SPAWN_RATE"

# Only add --run-time if it's specified and not empty
if [ -n "$RUN_TIME" ]; then
    CMD="$CMD --run-time=$RUN_TIME"
fi

# Add headless flag if enabled
if [ "$HEADLESS" = "true" ]; then
    CMD="$CMD --headless"
fi

echo "Starting Locust with configuration:"
echo "  Host: $HOST"
echo "  Users: $USERS"
echo "  Spawn Rate: $SPAWN_RATE"
echo "  Run Time: ${RUN_TIME:-unlimited}"
echo "  Headless: $HEADLESS"
echo ""
echo "Final Locust command:"
echo "$CMD"
echo ""

# Execute Locust
exec $CMD
