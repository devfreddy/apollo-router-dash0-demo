# Terraform Dash0 Configuration

Manages observability resources (checks, dashboards, synthetic checks, views) for Apollo Router using the Dash0 Terraform provider.

## Quick Start

```bash
# 1. Setup environment
cp ../.env.sample ../.env
vim ../.env  # Add: DASH0_AUTHORIZATION_TOKEN, DASH0_URL

# 2. Deploy
./tfwrap init
./tfwrap plan
./tfwrap apply
```

## What Gets Deployed

- **7 Alert Checks**: Error rate, P95/P99 latency, per-subgraph monitoring, availability
- **5 Dashboards**: Router performance, subgraph performance, query planning, resources, GraphQL errors
- **Synthetic Checks** (optional): HTTP health checks and GraphQL queries
- **Views** (optional): Custom visualizations for debugging and analysis

## Environment Configuration

Required variables in `.env`:
- `DASH0_AUTHORIZATION_TOKEN` - Get from https://app.dash0.com/settings/api-tokens (format: `auth_XXXXX`)
- `DASH0_URL` - API endpoint (default: `https://api.dash0.com`)

Optional variables with defaults:
- `TERRAFORM_DASH0_DATASET` - Dataset name (default: `default`)
- `TERRAFORM_PROJECT_NAME` - Resource prefix (default: `apollo-router`)
- `TERRAFORM_ERROR_RATE_THRESHOLD` - Alert threshold % (default: `5.0`)
- `TERRAFORM_LATENCY_P95_MS` - P95 threshold ms (default: `500`)
- `TERRAFORM_LATENCY_P99_MS` - P99 threshold ms (default: `1000`)
- `SERVICE_NAME` - Router service name (default: `apollo-router-demo`)
- `SUBGRAPH_SERVICES` - Comma-separated subgraph names

See `.env.sample` for complete list.

## Using tfwrap Script

The wrapper script loads `.env` and runs Terraform with proper configuration:

```bash
./tfwrap init        # Initialize (downloads provider)
./tfwrap plan        # Preview changes
./tfwrap apply       # Deploy resources
./tfwrap destroy     # Remove resources
./tfwrap validate    # Check configuration
./tfwrap output      # View resource IDs
```

## Alert Thresholds

Adjust in `.env`:
```bash
TERRAFORM_ERROR_RATE_THRESHOLD=2.0      # Stricter
TERRAFORM_LATENCY_P95_MS=300
TERRAFORM_LATENCY_P99_MS=700
```

Then apply: `./tfwrap apply`

## Project Structure

```
terraform/
├── tfwrap                    # Wrapper script (use this instead of terraform)
├── .env                      # Your config (not in git)
├── .env.sample              # Template with docs
├── providers.tf             # Provider setup
├── main.tf                  # Module definitions
├── variables.tf             # Input variables
├── outputs.tf               # Output values
└── modules/
    ├── checks/              # Alert rules (12 checks)
    ├── dashboards/          # Performance dashboards (5)
    ├── synthetic_checks/    # External health checks (placeholder)
    └── views/               # Custom visualizations (placeholder)
```

## Common Tasks

### View deployed resources
```bash
./tfwrap output
terraform state list
```

### Change alert thresholds
Edit `.env` and run `./tfwrap apply`

### Add custom check
Edit `modules/checks/main.tf`, add `dash0_check_rule` resource, run `./tfwrap apply`

### Disable all checks
```bash
TERRAFORM_ENABLE_CHECKS=false ./tfwrap apply
```

### Use different environment
```bash
source .env.prod && ./tfwrap plan
source .env.staging && ./tfwrap apply
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Missing environment variables" | Create `.env` from `.env.sample` |
| "Provider not found" | Run `./tfwrap init` |
| "Service not found" | Verify service names in `.env` match Dash0 UI |
| "Invalid authentication" | Check token format (must start with `auth_`) |
| "Dataset not found" | Update `TERRAFORM_DASH0_DATASET` in `.env` |

## Security

- `.env` is git-ignored (never commit it)
- Set permissions: `chmod 600 .env`
- Use environment variables in CI/CD instead of files
- Rotate tokens periodically

## State Management

Local state for development. For teams, configure remote backend (S3, Terraform Cloud, etc.):

```hcl
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "apollo-router/terraform.tfstate"
    region = "us-west-2"
  }
}
```

## Documentation

- **Quick reference**: This file
- **Detailed reference**: [README_SIMPLIFIED.md](README_SIMPLIFIED.md)
- **Environment setup**: [ENV_SETUP.md](ENV_SETUP.md)
- **tfwrap script guide**: [TFWRAP_GUIDE.md](TFWRAP_GUIDE.md)
- **Examples & customization**: [EXAMPLES.md](EXAMPLES.md)
- **Best practices & SLOs**: [RECOMMENDATIONS.md](RECOMMENDATIONS.md)
- **Resource reference**: [RESOURCES_REFERENCE.md](RESOURCES_REFERENCE.md)

## References

- [Dash0 Documentation](https://www.dash0.com/documentation)
- [Terraform Dash0 Provider](https://registry.terraform.io/providers/dash0hq/dash0/latest/docs)
- [Apollo Router Docs](https://www.apollographql.com/docs/router/)
- [Prometheus Querying](https://prometheus.io/docs/prometheus/latest/querying/basics/)
