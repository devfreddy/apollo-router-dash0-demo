# Products Subgraph - Python Implementation

A Python-based Apollo Federation subgraph implementation using Strawberry GraphQL, with comprehensive OpenTelemetry instrumentation.

## Features

- **Apollo Federation 2.0** support with Strawberry GraphQL
- **Complex GraphQL Schema** with nested types and relationships:
  - Product with manufacturer details
  - Product specifications and dimensions
  - Price history tracking
  - Inventory and rating information
  - Category and search filtering
- **OpenTelemetry Instrumentation**:
  - Distributed tracing with OTLP HTTP exporter
  - Automatic span creation for all resolver functions
  - Custom attributes for better observability
  - Metrics export to Dash0
  - Request instrumentation via ASGI middleware
- **Advanced Resolvers**:
  - Product queries with filtering
  - Search functionality
  - Category-based filtering
  - In-stock filtering
  - Top products ranking

## Project Structure

```
products-py/
├── main.py              # Main application with GraphQL schema and resolvers
├── otel.py              # OpenTelemetry initialization and configuration
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container image definition
├── .gitignore          # Git ignore patterns
└── README.md           # This file
```

## Installation

### Local Development

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the development server:
```bash
python main.py
```

The GraphQL playground will be available at `http://localhost:4003/graphql`

### Docker

Build and run the Docker image:

```bash
docker build -t products-subgraph-py .
docker run -p 4003:4003 products-subgraph-py
```

## Docker Compose Integration

The main `docker-compose.yaml` includes both Node.js and Python versions of the products subgraph.

### To use the Python version:

1. **Comment out the Node.js products service** in `docker-compose.yaml`:
```yaml
# products:
#   build:
#     context: ./subgraphs/products
#     dockerfile: Dockerfile
```

2. **Uncomment the Python products-py service** or add `--profile python`:
```bash
docker-compose up --profile python
```

3. **Update the router's depends_on** if using the service without profile:
```yaml
depends_on:
  - accounts
  - products-py  # Changed from 'products'
  - reviews
  - inventory
```

The supergraph configuration automatically works with the Python version since it uses the same port (4003).

## Configuration

### Environment Variables

All standard environment variables are supported:

- `PORT`: Server port (default: 4003)
- `ENVIRONMENT`: Deployment environment (default: "demo")
- `SERVICE_VERSION`: Service version (default: "1.0.0")
- `DASH0_AUTH_TOKEN`: Authentication token for Dash0
- `DASH0_TRACES_ENDPOINT`: OpenTelemetry traces endpoint
- `DASH0_METRICS_ENDPOINT`: OpenTelemetry metrics endpoint

### OpenTelemetry

The `otel.py` module handles all OpenTelemetry configuration:

- Initializes tracer and meter providers
- Configures OTLP HTTP exporters
- Instruments HTTP requests and GraphQL operations
- Sets up resource attributes for service identification

All spans include contextual information:
- `product.id`: Product identifier
- `product.found`: Whether product was found
- `category`: Search category filter
- `limit`: Query limit parameter
- `search.query`: Search query text
- `search.results`: Number of results found

## GraphQL Schema

### Queries

```graphql
type Query {
  products: [Product!]!
  product(id: ID!): Product
  topProducts(limit: Int = 5): [Product!]!
  productsByCategory(category: String!): [Product!]!
  productsInStock: [Product!]!
  searchProducts(query: String!): [Product!]!
}
```

### Types

```graphql
type Product {
  id: ID!
  name: String!
  price: Float!
  description: String
  category: String
  inStock: Boolean!
  sku: String!
  manufacturer: Manufacturer!
  dimensions: ProductDimensions!
  specifications: [Specification!]!
  availableColors: [String!]!
  warrantyMonths: Int!
  rating: Float
  priceHistory: [PriceHistory!]!
}

type Manufacturer {
  id: ID!
  name: String!
  country: String!
  foundedYear: Int!
}

type ProductDimensions {
  lengthCm: Float!
  widthCm: Float!
  heightCm: Float!
  weightKg: Float!
}

type Specification {
  key: String!
  value: String!
}

type PriceHistory {
  date: String!
  price: Float!
  discountPercent: Float
}
```

## Example Queries

### Get all products with full details:

```graphql
query GetAllProducts {
  products {
    id
    name
    price
    manufacturer {
      name
      country
    }
    specifications {
      key
      value
    }
    priceHistory {
      date
      price
      discountPercent
    }
  }
}
```

### Search products:

```graphql
query SearchTelescopes {
  searchProducts(query: "telescope") {
    id
    name
    price
    rating
  }
}
```

### Get products by category:

```graphql
query GetAccessories {
  productsByCategory(category: "Accessories") {
    id
    name
    price
    inStock
  }
}
```

## Instrumentation Points

The subgraph includes detailed tracing at multiple levels:

1. **Query Resolvers**: Each query resolver creates a span with relevant attributes
2. **Product Enrichment**: Price history generation is traced
3. **Search Operations**: Search queries include query text and result count
4. **Category Filtering**: Category filters are captured as span attributes
5. **Product Lookup**: Individual product lookups include success/failure tracking

## Development

### Adding Custom Instrumentation

To add custom spans to your resolvers:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@strawberry.field
def my_resolver(self) -> str:
    with tracer.start_as_current_span("my_operation") as span:
        span.set_attribute("custom.attribute", value)
        # Your logic here
        return result
```

### Running Tests

Currently, no tests are included. To add tests:

```bash
pip install pytest pytest-asyncio strawberry-graphql[testing]
pytest
```

## Differences from Node.js Version

The Python version (`products-py`) has several enhancements over the Node.js version:

1. **More complex data model** with manufacturer, dimensions, and specifications
2. **Price history generation** showing 12 months of pricing data
3. **Additional query resolvers** for filtering and search
4. **Manual span instrumentation** for detailed tracing
5. **Better typing** with Python type hints and Strawberry decorators

## Performance Considerations

- Price history is generated on-the-fly for each request (can be optimized with caching)
- All product data is in-memory (suitable for demo/development)
- ASGI middleware provides automatic instrumentation with minimal overhead

## Next Steps

To expand this subgraph further:

1. **Database Integration**: Replace in-memory data with real database queries
2. **Advanced Metrics**: Add custom metrics for business operations
3. **Caching**: Implement caching for price history and frequently accessed products
4. **Federation Relationships**: Add entity references to other subgraphs (User reviews, Inventory)
5. **Error Handling**: Add detailed error handling and custom exceptions with tracing
6. **Validation**: Add input validation and GraphQL error extensions
7. **Mutations**: Implement product creation/update mutations with full instrumentation

## Resources

- [Strawberry GraphQL Documentation](https://strawberry.rocks/)
- [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/)
- [OpenTelemetry Python](https://opentelemetry.io/docs/instrumentation/python/)
- [Dash0 Integration](https://www.dash0.com/)
