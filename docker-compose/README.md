# Docker Compose Deployment

Local development environment with Docker Compose. Perfect for quick iteration and testing.

## Available Configurations

### Core Services (docker-compose.yaml) - Recommended
Simple setup with just the essentials:
- **Apollo Router** (port 4000) - GraphQL gateway
- **Accounts Subgraph** (port 4001)
- **Reviews Subgraph** (port 4002)
- **Products Subgraph (Python)** (port 4003)
- **Inventory Subgraph** (port 4004)
- **PostgreSQL** (port 5432) - Database for inventory

**Best for:** Local development, quick testing

### Full Demo (docker-compose.full.yaml) - Willful Waste
Extended setup with website and bot for realistic demo:
- All core services (above)
- **Willful Waste Website** (port 3000)
- **Traffic Bot** (simulates user interactions)

**Best for:** Full e-commerce demo, load testing, showcasing the complete system

To use the full version:
```bash
docker-compose -f docker-compose.full.yaml up -d
docker-compose -f docker-compose.full.yaml --profile bot up -d willful-waste-bot
```

See [docs/WILLFUL_WASTE_SETUP.md](../docs/WILLFUL_WASTE_SETUP.md) for detailed setup instructions.

## Quick Start

```bash
# Start all services
./start.sh

# Stop all services
./stop.sh

# Check status
./status.sh
```

## Development Workflow

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f router
docker-compose logs -f inventory

# Rebuild and restart a service
docker-compose up -d --build inventory

# Access database
psql -h localhost -U inventory_user -d inventory_db
```

## Configuration

### Environment Variables

Configuration uses `.env` from the project root:
- `DASH0_AUTH_TOKEN` - Dash0 authentication token
- `DASH0_DATASET` - Dash0 dataset name
- `DASH0_METRICS_ENDPOINT` - Metrics endpoint
- `DASH0_TRACES_ENDPOINT` - Traces endpoint
- Service error rates for testing

See `../.env.sample` for all options.

### Docker Compose Overrides

For local development customization, use `docker-compose.override.yml`:

```bash
# Copy the example
cp docker-compose.override.example.yml docker-compose.override.yml

# Edit for your needs (auto-loaded by Docker Compose)
nano docker-compose.override.yml
```

Common overrides:
- Increase concurrent bots for load testing
- Mount local code for hot reload
- Set error rates for chaos testing
- Configure logging levels

See `docker-compose.override.example.yml` for examples.

## Testing

### GraphQL Queries

Access Apollo Sandbox at: http://localhost:4000/

```graphql
query {
  topProducts {
    id
    name
    price
  }
}
```

### Database

```bash
# Connect to PostgreSQL
psql -h localhost -U inventory_user -d inventory_db

# View inventory
SELECT * FROM inventory;
```

## Troubleshooting

**Services failing to start?**
```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache

# Full restart
docker-compose down -v
./start.sh
```

**Port already in use?**
```bash
# Find and stop conflicting containers
docker ps
docker stop <container_id>
```

## Comparison with Kubernetes

| Aspect | Docker Compose | Kubernetes |
|--------|---|---|
| Setup time | ~1-2 minutes | ~5-10 minutes |
| Complexity | Simple | Enterprise-grade |
| Observability | Basic | Full (Dash0 integration) |
| Scaling | Manual | Automatic |
| Production ready | No | Yes |

For production-like deployment with full observability, see `../kubernetes/README.md`.
