#!/bin/bash
# Entrypoint script for Locust bot
# Uses environment variables from ConfigMap for dynamic configuration

set -e

# Default values
USERS=${LOCUST_USERS:-5}
SPAWN_RATE=${LOCUST_SPAWN_RATE:-1}
RUN_TIME=${LOCUST_RUN_TIME}  # Can be empty string (run forever)
HOST=${LOCUST_HOST:-http://apollo-router:4000}
HEADLESS=${LOCUST_HEADLESS:-true}

# Validation
if [ -z "$HOST" ]; then
    echo "ERROR: LOCUST_HOST not set and no default available"
    exit 1
fi

# Unset LOCUST_RUN_TIME if it's empty to prevent Locust from trying to parse it
if [ -z "$RUN_TIME" ]; then
    unset LOCUST_RUN_TIME
fi

echo "Starting Locust with configuration:"
echo "  Host: $HOST"
echo "  Users: $USERS"
echo "  Spawn Rate: $SPAWN_RATE"
echo "  Run Time: ${RUN_TIME:-unlimited}"
echo "  Headless: $HEADLESS"
echo ""

# Validate host connectivity (basic check)
HOST_URL="${HOST#http://}"
HOST_URL="${HOST_URL#https://}"
HOST_ONLY="${HOST_URL%%/*}"
HOST_IP="${HOST_ONLY%%:*}"
HOST_PORT="${HOST_ONLY##*:}"

# If port wasn't specified, infer from protocol
if [ "$HOST_PORT" = "$HOST_ONLY" ]; then
    if [[ "$HOST" == https://* ]]; then
        HOST_PORT=443
    else
        HOST_PORT=80
    fi
fi

echo "Validating connectivity to target host..."
echo "  Target: $HOST_IP:$HOST_PORT"

# Try to connect with timeout
if timeout 10 bash -c "echo >/dev/tcp/$HOST_IP/$HOST_PORT" 2>/dev/null; then
    echo "✓ Target host is reachable"
else
    echo "WARNING: Could not verify connectivity to $HOST_IP:$HOST_PORT"
    echo "         Locust will attempt to connect anyway..."
fi

echo ""

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

echo "Final Locust command:"
echo "$CMD"
echo ""

# Execute Locust
exec $CMD
