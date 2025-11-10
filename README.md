# Apollo Router + Dash0 Observability

Apollo GraphQL Router v2 integration with Dash0 observability platform. This project implements a federated GraphQL architecture with load testing to generate realistic telemetry data for evaluating Dash0 as an observability vendor.

## Project Overview

This project creates a production-like environment to evaluate how Apollo Router v2 exports OpenTelemetry metrics and traces to Dash0. The architecture includes:

- **Apollo Router v2**: The supergraph gateway that federates multiple subgraphs
- **Custom Subgraphs**: Four Node.js-based GraphQL subgraphs (products, reviews, accounts, inventory)
- **Load Generation**: Vegeta-based HTTP load testing with realistic GraphQL queries
- **Observability**: OpenTelemetry integration sending metrics and traces to Dash0

## Architecture

```
┌─────────────┐
│   Vegeta    │ (Load Generator)
│ Load Tests  │
└──────┬──────┘
       │ GraphQL Queries
       ▼
┌─────────────────────────────┐
│   Apollo Router v2          │
│   (Port 4000)               │
│                             │
│   - Query Planning          │
│   - Federation              │
│   - OTLP Export to Dash0    │
└──────┬──────────────────────┘
       │
       ├─────────┬─────────┬─────────┐
       ▼         ▼         ▼         ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │Products│ │Reviews │ │Accounts│ │Inventory│
   │ :4003  │ │ :4002  │ │ :4001  │ │ :4004   │
   └────────┘ └────────┘ └────────┘ └────────┘
       │         │         │         │
       └─────────┴─────────┴─────────┘
                   │
                   ▼
            ┌──────────────┐
            │    Dash0     │
            │ (Cloud OTLP) │
            └──────────────┘
```

## What This Demo Showcases

### 1. Federation Architecture
- Multiple subgraphs composed into a unified supergraph
- Type federation across services (e.g., User type extended across accounts and reviews)
- Realistic e-commerce data model with products, reviews, and user accounts

### 2. Observability with Dash0
- **Metrics**: Request rates, latencies, error rates from Apollo Router
- **Traces**: Distributed tracing showing the full request flow through the router and subgraphs
- **OpenTelemetry Protocol**: Standard OTLP export over HTTP with authentication

### 3. Load Testing
- Vegeta HTTP load generator simulating realistic traffic patterns
- Multiple query patterns: simple queries, nested queries, and complex federated queries
- Configurable request rates to demonstrate performance under load

## Technology Stack

- **Apollo Router v2**: Latest version of Apollo's high-performance Rust-based router
- **Node.js Subgraphs**: Custom-built federation-compatible GraphQL services
- **Vegeta**: Modern HTTP load testing tool
- **Docker Compose**: Container orchestration for local development
- **Dash0**: Cloud-native observability platform with OpenTelemetry support

## Project Structure

The project is organized into **two clear deployment paths** - choose the one that fits your needs:

```
.
├── docker-compose/           # Docker Compose deployment (local development)
│   ├── docker-compose.yaml   # Core services only (router + subgraphs + DB)
│   ├── start.sh              # Quick start script
│   ├── stop.sh               # Shutdown script
│   ├── status.sh             # Check status
│   └── README.md             # Compose-specific documentation
│
├── kubernetes/               # Kubernetes deployment (k3d)
│   ├── start.sh              # Start k3d cluster
│   ├── stop.sh               # Tear down cluster
│   ├── status.sh             # Check cluster status
│   ├── helm-values/          # Helm chart values for router
│   ├── base/                 # Kubernetes manifests
│   ├── scripts/              # Deployment scripts (k3d-up.sh, etc.)
│   ├── README.md             # Main Kubernetes docs
│   └── README-DEPLOYMENT.md  # Deployment guide
│
├── shared/                   # Shared across both deployments
│   ├── router/               # Apollo Router config and schema
│   │   ├── router.yaml       # Router configuration
│   │   └── supergraph.graphql # Federation schema
│   └── subgraphs/            # All subgraph services
│       ├── accounts/         # User accounts subgraph
│       ├── products-py/      # Product catalog (Python)
│       ├── reviews/          # Reviews subgraph
│       ├── inventory/        # Inventory management
│       └── shared/           # Common utilities
│
├── .env                      # Your credentials (shared by both paths)
├── .env.sample               # Template with all options
├── dashboards/               # Dash0 dashboard templates
├── docs/                     # Documentation
├── scripts/                  # Root-level utilities
├── terraform/                # Infrastructure as code
├── README.md                 # This file
└── CLAUDE.md                 # AI assistant guidelines
```

## Key Features

### Apollo Router Configuration
- Supergraph composition with introspection enabled
- Query plan caching for performance
- OpenTelemetry exporter configured for Dash0
- Trace sampling and resource attributes
- HTTP/2 support for OTLP

### Subgraph Implementation
- Federation v2 directives
- Entity resolution for type extensions
- Reference resolvers for federated types
- Custom scalar types
- Realistic data generators

### Load Testing Scenarios
- **Products Query**: Simple top products list
- **Reviews Query**: Federated query across users and reviews
- **Large Query**: Complex nested query to test performance
- **Recommended Query**: Multi-hop federated query

## 📚 Documentation

**Willful Waste Retail Store** (New Feature!)
- Complete e-commerce demo with frontend, bot, and full observability
- Quick start: See [docs/START_HERE.md](./docs/START_HERE.md)
- Full setup: See [docs/WILLFUL_WASTE_SETUP.md](./docs/WILLFUL_WASTE_SETUP.md)
- Website docs: See [website/README.md](./website/README.md)
- Bot docs: See [website-bot/README.md](./website-bot/README.md)

**General Documentation**
- Project structure guide: [docs/STRUCTURE.md](./docs/STRUCTURE.md)
- Migration guide: [docs/MIGRATION.md](./docs/MIGRATION.md) (what changed in restructuring)
- Quick commands: [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)
- Complete index: [docs/INDEX.md](./docs/INDEX.md)
- Implementation details: [docs/IMPLEMENTATION_DETAILS.md](./docs/IMPLEMENTATION_DETAILS.md)

## Getting Started

### Prerequisites
- Docker (or Colima on macOS)
- Dash0 account with API token (for observability features)
- (Optional) Node.js 18+ for local subgraph development

### Quick Start

Choose your deployment path:

#### Option 1: Docker Compose (Recommended for Local Development)

Perfect for fast iteration and testing. ~1-2 minute startup.

```bash
# 1. Configure credentials
cp .env.sample .env
# Edit .env and set:
#   - DASH0_AUTH_TOKEN
#   - DASH0_REGION

# 2. Start services
cd compose
./start.sh

# 3. Access GraphQL API
# http://localhost:4000
```

For more details, see [compose/README.md](compose/README.md).

#### Option 2: Kubernetes (k3d) - Production-like Deployment

Full Kubernetes cluster with Dash0 operator, auto-instrumentation, and CloudNativePG database. ~5-10 minute setup.

```bash
# 1. Configure credentials
cp .env.sample .env
# Edit .env and set:
#   - DASH0_AUTH_TOKEN
#   - DASH0_REGION
#   - DASH0_METRICS_ENDPOINT
#   - DASH0_TRACES_ENDPOINT

# 2. Start cluster
cd kubernetes
./start.sh

# 3. Check status
./status.sh
```

For more details, see [kubernetes/README-DEPLOYMENT.md](kubernetes/README-DEPLOYMENT.md).

### Comparison

| Feature | Docker Compose | Kubernetes |
|---------|---|---|
| **Setup time** | ~1-2 min | ~5-10 min |
| **Complexity** | Low | Medium |
| **Observability** | Basic | Full (Dash0) |
| **Database** | Single PostgreSQL | CloudNativePG replicated |
| **Best for** | Local dev, quick tests | Production evaluation |

### Load Testing

Start load generation:
```bash
docker compose --profile load-testing up -d vegeta
```

Adjust load parameters in [.env](.env):
```bash
VEGETA_RATE=10        # Requests per second
VEGETA_DURATION=0     # 0 = infinite duration
VEGETA_TIMEOUT=10s    # Request timeout
```

## Environment Variables

This project uses environment variables for secure configuration management.

### Quick Setup

```bash
# Copy the sample environment file
cp .env.sample .env

# Edit .env with your credentials
nano .env
```

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DASH0_AUTH_TOKEN` | Dash0 API token with "Bearer " prefix | `Bearer auth_abc123...` |
| `DASH0_REGION` | Your Dash0 region | `us-west-2` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APOLLO_KEY` | Apollo GraphOS API key | Not set |
| `APOLLO_GRAPH_REF` | Apollo GraphOS graph reference | Not set |
| `SERVICE_NAME` | OpenTelemetry service name | `apollo-router-demo` |
| `SERVICE_VERSION` | Service version | `2.0` |
| `ENVIRONMENT` | Deployment environment | `demo` |
| `VEGETA_RATE` | Load test requests/sec | `5` |

### Getting Dash0 Credentials

1. **API Token:**
   - Log into https://app.dash0.com
   - Navigate to **Settings** → **API Tokens**
   - Create new token with write permissions for metrics and traces
   - Copy token and add "Bearer " prefix in `.env`

2. **Region:**
   - Found in your Dash0 dashboard URL or Settings → Endpoints
   - Common: `us-west-2`, `us-east-1`, `eu-central-1`

### How It Works

The router configuration uses environment variable expansion:

```yaml
telemetry:
  exporters:
    metrics:
      otlp:
        endpoint: "${env.DASH0_METRICS_ENDPOINT}"
        http:
          headers:
            "Authorization": "${env.DASH0_AUTH_TOKEN}"
```

Docker Compose loads variables from `.env` and passes them to containers.

## Session Notes

Development session notes are organized in [docs/sessions/](docs/sessions/). Each session has its own directory with:
- `notes.md` - Detailed session notes, findings, and configurations
- `wrap-up.md` - Session summary and next steps

Latest session: [2025-10-12](docs/sessions/2025-10-12/) - Fixed Docker health checks and trace sampling for complete service map visibility

## Dashboards

This project includes a comprehensive Apollo Router performance dashboard converted from the official Apollo GraphOS Datadog template.

**Location:** [dashboards/](dashboards/)

**Features:**
- Automated conversion from Datadog to Dash0 Perses format
- 41 monitoring panels across all Apollo Router metrics
- One-command deployment via Dash0 API
- Full PromQL query conversion

**Quick Start:**
```bash
cd dashboards
node convert.js    # Convert Datadog template to Dash0 format
./deploy.sh        # Deploy to your Dash0 account
```

See [dashboards/README.md](dashboards/README.md) for detailed documentation.

## TODO

1. ✅ ~~Test/try out connecting to https://api.us-west-2.aws.dash0.com/mcp with Claude Code~~ - **Completed** (See [2025-10-11 notes](docs/sessions/2025-10-11/notes.md))
2. ✅ ~~Test Dash0 MCP server functionality~~ - **Completed** (All MCP tools verified working)
3. ✅ ~~Pull in Datadog template and recreate in Dash0~~ - **Completed** (See [dashboards/README.md](dashboards/README.md))
4. ✅ ~~Fix broken dashboard panels and temporality configuration~~ - **Completed** (See [2025-10-15 wrap-up](docs/sessions/2025-10-15/wrap-up.md))
5. ✅ ~~Add Kubernetes (k3d) deployment option~~ - **Completed** (See [kubernetes/README.md](kubernetes/README.md))
6. ✅ ~~Integrate Dash0 Kubernetes operator~~ - **Completed** (See [2025-10-17 wrap-up](docs/sessions/2025-10-17/wrap-up.md))

### Next Steps
- Test dashboard with diverse GraphQL queries to verify all panels
- Verify Node.js subgraph auto-instrumentation in k8s
- Add Dash0 alert rules for key metrics (error rate, latency spikes)
- Add load testing deployment to k8s
- Document metric thresholds and troubleshooting runbook

## Reference

This project is inspired by the [Apollo Router Performance Workshop](https://github.com/apollographql-education/odyssey-router-performance), adapted for Dash0 observability evaluation.
