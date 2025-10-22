# Python Products Subgraph - Complete Setup Guide

This guide walks you through setting up and testing the new Python products subgraph in the apollo-router-dash0-demo project.

## Quick Start - Using Docker Compose

### Option 1: Run Python subgraph standalone (recommended for testing)

```bash
# From project root
docker-compose up --profile python products-py
```

This will start just the Python products subgraph on `http://localhost:4003/graphql`

### Option 2: Replace Node.js products subgraph

Edit `docker-compose.yaml`:

1. **Comment out the Node.js products service** (lines 68-93):
```yaml
# products:
#   build:
#     context: ./subgraphs/products
#     dockerfile: Dockerfile
#   ...
```

2. **Update the router service's depends_on** (line 27-31):
```yaml
depends_on:
  - accounts
  - products-py    # Changed from 'products'
  - reviews
  - inventory
```

3. **Start the full stack**:
```bash
docker-compose up
```

## Local Development Setup

### Prerequisites

- Python 3.10+
- pip or poetry for package management

### Installation Steps

1. **Navigate to the subgraph directory**:
```bash
cd subgraphs/products-py
```

2. **Create a virtual environment**:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Create a `.env` file** (optional, for local development):
```bash
# Copy from project root or create locally
PORT=4003
ENVIRONMENT=development
SERVICE_VERSION=1.0.0-dev
# DASH0_AUTH_TOKEN=your_token
# DASH0_TRACES_ENDPOINT=your_endpoint
# DASH0_METRICS_ENDPOINT=your_endpoint
```

5. **Run the development server**:
```bash
python main.py
```

You should see output like:
```
🔭 OpenTelemetry instrumentation initialized for products-subgraph-py
🚀 Products subgraph ready at http://localhost:4003/graphql
```

## Testing the Python Subgraph

### Via GraphQL Playground

1. **Open your browser** and navigate to `http://localhost:4003/graphql`

2. **Try these queries**:

```graphql
# Get all products
query GetAllProducts {
  products {
    id
    name
    price
    rating
    inStock
  }
}
```

```graphql
# Get a specific product with full details
query GetProductDetails {
  product(id: "1") {
    id
    name
    price
    description
    sku
    manufacturer {
      name
      country
      foundedYear
    }
    dimensions {
      lengthCm
      widthCm
      heightCm
      weightKg
    }
    specifications {
      key
      value
    }
    availableColors
    warrantyMonths
    rating
    priceHistory {
      date
      price
      discountPercent
    }
  }
}
```

```graphql
# Search products
query SearchProducts {
  searchProducts(query: "telescope") {
    id
    name
    price
    manufacturer {
      name
    }
  }
}
```

```graphql
# Get products by category
query GetByCategory {
  productsByCategory(category: "Telescopes") {
    id
    name
    price
    category
  }
}
```

```graphql
# Get in-stock products
query GetInStock {
  productsInStock {
    id
    name
    inStock
  }
}
```

### Via curl

```bash
# Simple query
curl -X POST http://localhost:4003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ products { id name price } }"
  }'

# With variables
curl -X POST http://localhost:4003/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query GetProduct($id: ID!) { product(id: $id) { name price } }",
    "variables": { "id": "1" }
  }'
```

## Comparing Node.js vs Python Implementations

### Data Returned

| Feature | Node.js | Python |
|---------|---------|--------|
| Basic Product Info | ✓ | ✓ |
| Price | ✓ | ✓ |
| Category | ✓ | ✓ |
| Stock Status | ✓ | ✓ |
| SKU | ✗ | ✓ |
| Manufacturer Details | ✗ | ✓ |
| Dimensions | ✗ | ✓ |
| Specifications | ✗ | ✓ |
| Available Colors | ✗ | ✓ |
| Warranty | ✗ | ✓ |
| Rating | ✗ | ✓ |
| Price History | ✗ | ✓ |

### Queries Available

**Node.js version**:
- `products`: Get all products
- `product(id)`: Get single product
- `topProducts(limit)`: Get top N products

**Python version** (includes all above plus):
- `productsByCategory(category)`: Filter by category
- `productsInStock`: Get only in-stock items
- `searchProducts(query)`: Full-text search

## Integration with Apollo Router

When running the full stack, the Python subgraph is automatically available through the Apollo Router gateway.

### Verify Integration

1. **Query through the router**:
```bash
curl -X POST http://localhost:4000 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ topProducts { id name price } }"
  }'
```

2. **Check the supergraph includes Python schema**:
```bash
curl http://localhost:4000/.well-known/apollo/server-health
```

## OpenTelemetry Instrumentation

The Python subgraph includes comprehensive OpenTelemetry instrumentation. When connected to Dash0:

### What Gets Traced

1. **All Query Resolvers**: Each GraphQL query creates a span
2. **Product Lookups**: Individual product queries include:
   - Product ID attribute
   - Found/not found status
3. **Search Operations**: Search queries include:
   - Search query text
   - Result count
4. **Category Filtering**: Category filters are captured
5. **HTTP Requests**: All outgoing HTTP requests are traced
6. **ASGI Middleware**: All incoming HTTP requests are traced

### Example Span Attributes

```
query.product
  ├── product.id = "1"
  ├── product.found = true
  └── duration = 2.5ms

query.searchProducts
  ├── search.query = "telescope"
  ├── search.results = 2
  └── duration = 4.1ms

query.productsByCategory
  ├── category = "Accessories"
  └── duration = 1.8ms
```

### Enabling Observability

Set these environment variables:

```bash
export DASH0_AUTH_TOKEN="your-token-here"
export DASH0_TRACES_ENDPOINT="https://ingress.YOUR_REGION.dash0.com/v1/traces"
export DASH0_METRICS_ENDPOINT="https://ingress.YOUR_REGION.dash0.com/v1/metrics"
export SERVICE_VERSION="1.0.0"
export ENVIRONMENT="production"
```

Then restart the service:
```bash
python main.py
```

## Troubleshooting

### Port Already in Use

If port 4003 is already in use:

```bash
# Find what's using it
lsof -i :4003

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=5003 python main.py
```

### Module Not Found Errors

Ensure virtual environment is activated and dependencies installed:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Connection Refused

If you get connection refused when querying:

1. **Check the server is running**: Should see "🚀 Products subgraph ready" message
2. **Verify the port**: Default is 4003
3. **Check firewall**: Ensure port isn't blocked

### GraphQL Errors

- **"Unknown field"**: Schema might be outdated. Restart the server
- **"Field error"**: Check the resolver implementation in `main.py`
- **Apollo federation errors**: Verify the @key directive is present

## Next Steps & Enhancements

### Immediate Tasks

1. **Test Federation**: Verify it works with other subgraphs through the router
2. **Load Testing**: Use vegeta to stress test and observe in Dash0
3. **Query Performance**: Monitor trace timings

### Future Improvements

1. **Database Backend**: Replace in-memory data with PostgreSQL/MongoDB
2. **Caching**: Add Redis caching for price history and frequent queries
3. **Mutations**: Implement product updates/creation
4. **Subscriptions**: Add real-time product updates
5. **Advanced Metrics**: Track business KPIs (searches, popular categories, etc.)
6. **Error Handling**: Implement custom error types and logging
7. **Validation**: Add input validation and custom error messages
8. **Batch Loading**: Optimize N+1 query problems with DataLoader pattern

## File Structure Reference

```
subgraphs/products-py/
├── main.py              # GraphQL schema, types, and resolvers
├── otel.py              # OpenTelemetry setup and configuration
├── requirements.txt     # Python package dependencies
├── Dockerfile           # Container image for deployment
├── .gitignore          # Files to ignore in git
├── README.md           # Detailed subgraph documentation
└── venv/               # Virtual environment (local dev only)
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│       Apollo Router Gateway              │
│          (port 4000)                     │
└────────────┬─────────────────────────────┘
             │
    ┌────────┴────────┬────────────┬──────────────┐
    │                 │            │              │
    v                 v            v              v
┌─────────┐     ┌──────────┐   ┌────────┐   ┌──────────┐
│Accounts │     │Products  │   │Reviews │   │Inventory │
│(Node.js)│     │(Python)  │   │(Node.js)   │(Node.js)
│:4001    │     │:4003     │   │:4002   │   │:4004     │
└─────────┘     └──────────┘   └────────┘   └──────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        v                             v
  ┌─────────────┐            ┌────────────────┐
  │  In-Memory  │            │OpenTelemetry   │
  │  Product    │            │  (OTLP HTTP)   │
  │   Data      │            │      to        │
  └─────────────┘            │    Dash0       │
                             └────────────────┘
```

## Performance Benchmarks (Expected)

On local machine with Docker:

- `products()`: ~2-3ms (5 products)
- `product(id)`: ~1-2ms (direct lookup)
- `topProducts()`: ~2-3ms
- `searchProducts()`: ~3-5ms (depends on query complexity)
- `productsByCategory()`: ~2-3ms

Note: Price history generation adds ~0.5-1ms per product.

## Getting Help

### Resources

- [Strawberry GraphQL Docs](https://strawberry.rocks/)
- [OpenTelemetry Python](https://opentelemetry.io/docs/instrumentation/python/)
- [Apollo Federation](https://www.apollographql.com/docs/)
- Project README: `../README.md`

### Debugging

Enable verbose logging by modifying `otel.py`:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Check Docker logs:

```bash
docker logs products-py
docker logs router
```

---

**Last Updated**: October 2024
**Python Version**: 3.10+
**Strawberry Version**: 0.238.0
