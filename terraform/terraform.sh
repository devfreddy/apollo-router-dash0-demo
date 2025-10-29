#!/bin/bash

# ============================================================================
# Terraform Wrapper Script for Dash0 Configuration
# ============================================================================
# Purpose: Load environment variables from .env and run Terraform commands
#
# Usage:
#   ./terraform.sh init
#   ./terraform.sh plan
#   ./terraform.sh apply
#   ./terraform.sh destroy
#   ./terraform.sh validate
#
# Features:
#   - Automatically sources .env file
#   - Sets Terraform variables from environment
#   - Validates required variables before running
#   - Provides helpful error messages
#   - Supports all standard terraform commands
#
# Setup:
#   1. chmod +x terraform.sh
#   2. cp ../.env.sample ../.env
#   3. Edit ../.env with your values
#   4. ./terraform.sh init
#
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================================================
# Load Environment Variables
# ============================================================================

load_env() {
    if [[ ! -f "$ENV_FILE" ]]; then
        print_error "Environment file not found: $ENV_FILE"
        echo ""
        echo "To set up your environment:"
        echo "  1. cp ${ENV_FILE}.sample ${ENV_FILE}"
        echo "  2. Edit ${ENV_FILE} with your Dash0 credentials"
        echo "  3. Run: source ${ENV_FILE}"
        exit 1
    fi

    print_info "Loading environment variables from: $ENV_FILE"
    set -a
    source "$ENV_FILE"
    set +a
    print_success "Environment variables loaded"
}

# ============================================================================
# Validate Required Variables
# ============================================================================

validate_env() {
    local required_vars=(
        "DASH0_AUTH_TOKEN"
        "DASH0_URL"
    )

    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            missing_vars+=("$var")
        fi
    done

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please set these variables in: $ENV_FILE"
        echo "Or export them before running this script:"
        echo ""
        for var in "${missing_vars[@]}"; do
            echo "  export $var=<value>"
        done
        exit 1
    fi

    print_success "All required environment variables are set"
}

# ============================================================================
# Convert Environment Variables to Terraform Variables
# ============================================================================

setup_terraform_vars() {
    # Create terraform variables from environment variables
    export TF_VAR_dash0_auth_token="${DASH0_AUTH_TOKEN}"
    export TF_VAR_dataset="${DASH0_DATASET:-default}"
    export TF_VAR_project_name="${TERRAFORM_PROJECT_NAME:-apollo-router}"
    export TF_VAR_environment="${ENVIRONMENT:-demo}"
    export TF_VAR_router_service_name="${SERVICE_NAME:-apollo-router-demo}"

    # Convert comma-separated subgraph services to array
    if [[ -n "${SUBGRAPH_SERVICES:-}" ]]; then
        export TF_VAR_subgraph_service_names="$(echo "$SUBGRAPH_SERVICES" | tr ',' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | jq -R . | jq -s .)"
    fi

    # Configure thresholds
    export TF_VAR_alert_thresholds="{
        error_rate_threshold_percent = ${TERRAFORM_ERROR_RATE_THRESHOLD:-5.0}
        latency_p95_ms = ${TERRAFORM_LATENCY_P95_MS:-500}
        latency_p99_ms = ${TERRAFORM_LATENCY_P99_MS:-1000}
    }"

    export TF_VAR_synthetic_check_interval_seconds="${TERRAFORM_SYNTHETIC_CHECK_INTERVAL:-60}"
    export TF_VAR_synthetic_check_timeout_seconds="${TERRAFORM_SYNTHETIC_CHECK_TIMEOUT:-10}"

    # Feature toggles
    export TF_VAR_enable_checks="${TERRAFORM_ENABLE_CHECKS:-true}"
    export TF_VAR_enable_dashboards="${TERRAFORM_ENABLE_DASHBOARDS:-true}"
    export TF_VAR_enable_synthetic_checks="${TERRAFORM_ENABLE_SYNTHETIC_CHECKS:-false}"
    export TF_VAR_enable_views="${TERRAFORM_ENABLE_VIEWS:-false}"

    print_success "Terraform variables configured"
}

# ============================================================================
# Display Configuration
# ============================================================================

display_config() {
    echo ""
    print_header "Configuration Summary"
    echo ""
    echo "Dash0 Settings:"
    echo "  API URL: ${DASH0_URL}"
    echo "  Dataset: ${DASH0_DATASET:-default}"
    echo "  Project: ${TERRAFORM_PROJECT_NAME:-apollo-router}"
    echo ""
    echo "Service Settings:"
    echo "  Router: ${SERVICE_NAME:-apollo-router-demo}"
    echo "  Environment: ${ENVIRONMENT:-demo}"
    echo "  Subgraphs: ${SUBGRAPH_SERVICES:-accounts-subgraph,products-subgraph-python,reviews-subgraph,inventory-subgraph}"
    echo ""
    echo "Alert Thresholds:"
    echo "  Error Rate: ${TERRAFORM_ERROR_RATE_THRESHOLD:-5.0}%"
    echo "  P95 Latency: ${TERRAFORM_LATENCY_P95_MS:-500}ms"
    echo "  P99 Latency: ${TERRAFORM_LATENCY_P99_MS:-1000}ms"
    echo ""
    echo "Features Enabled:"
    echo "  Checks: ${TERRAFORM_ENABLE_CHECKS:-true}"
    echo "  Dashboards: ${TERRAFORM_ENABLE_DASHBOARDS:-true}"
    echo "  Synthetic Checks: ${TERRAFORM_ENABLE_SYNTHETIC_CHECKS:-false}"
    echo "  Views: ${TERRAFORM_ENABLE_VIEWS:-false}"
    echo ""
}

# ============================================================================
# Main Script Logic
# ============================================================================

main() {
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed or not in PATH"
        echo ""
        echo "Install Terraform from: https://www.terraform.io/downloads.html"
        exit 1
    fi

    # Load and validate environment
    load_env
    validate_env
    setup_terraform_vars

    # Display configuration if running plan or apply
    if [[ "${1:-}" =~ ^(plan|apply|destroy|init)$ ]]; then
        display_config
        echo ""
    fi

    # Show help if no arguments
    if [[ $# -eq 0 ]]; then
        print_header "Terraform Wrapper for Dash0"
        echo ""
        echo "Usage: ./terraform.sh <command> [options]"
        echo ""
        echo "Common Commands:"
        echo "  ./terraform.sh init       Initialize Terraform working directory"
        echo "  ./terraform.sh plan       Show planned changes"
        echo "  ./terraform.sh apply      Apply changes"
        echo "  ./terraform.sh destroy    Destroy resources"
        echo "  ./terraform.sh validate   Validate configuration"
        echo "  ./terraform.sh fmt        Format Terraform files"
        echo "  ./terraform.sh output     Show output values"
        echo ""
        echo "Advanced Commands:"
        echo "  ./terraform.sh refresh    Refresh state"
        echo "  ./terraform.sh state      Manage state"
        echo "  ./terraform.sh import     Import resources"
        echo ""
        echo "Configuration File: $ENV_FILE"
        echo ""
        exit 0
    fi

    # Run terraform with the provided arguments
    print_info "Running: terraform $@"
    echo ""
    terraform "$@"

    # Show next steps if apply was successful
    if [[ "$1" == "apply" ]]; then
        echo ""
        print_success "Terraform apply completed successfully!"
        echo ""
        echo "Next steps:"
        echo "  1. Check Dash0 UI for new resources: https://app.dash0.com"
        echo "  2. View outputs: ./terraform.sh output"
        echo "  3. Configure Slack notifications (optional)"
        echo "  4. Customize alert thresholds in .env and re-run: ./terraform.sh apply"
        echo ""
    fi
}

# ============================================================================
# Run Main Function
# ============================================================================

main "$@"
