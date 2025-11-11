# Accounts Subgraph (Java/Spring GraphQL)

A Java-based implementation of the Accounts subgraph using Spring GraphQL and Spring Boot 3.3. This is a parallel implementation alongside the Node.js version for showcasing polyglot microservices with Apollo Federation.

## Technology Stack

- **Framework**: Spring GraphQL with Spring Boot 3.3
- **Language**: Java 17
- **GraphQL**: Apollo Federation 2.0 (schema-first)
- **Observability**: OpenTelemetry via Micrometer with Dash0 integration
- **Build**: Maven 3.9 with Maven wrapper

## Prerequisites

- **Java 17+** (Already installed on your machine)
- **Maven wrapper** (Included - no separate install needed!)
- Docker (for containerization)

## Quick Start

### Local Development

1. **Build the project** (uses Maven wrapper):
   ```bash
   ./mvnw clean package
   ```

2. **Run the application**:
   ```bash
   PORT=4001 DASH0_DATASET=gtm-dash0 DASH0_AUTH_TOKEN=your-token DASH0_TRACES_ENDPOINT=http://localhost:4317 ./mvnw spring-boot:run
   ```

   Or run the JAR directly:
   ```bash
   PORT=4001 java -jar target/accounts-subgraph-0.1.0.jar
   ```

3. **Access GraphiQL**: http://localhost:4001/graphiql

### Docker Build

```bash
docker build -t accounts-subgraph-java:latest .
```

## Configuration

Environment variables (see `application.yml`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4001` | Server port |
| `DASH0_DATASET` | - | Dash0 dataset identifier |
| `DASH0_AUTH_TOKEN` | - | Dash0 authentication token |
| `DASH0_TRACES_ENDPOINT` | `http://localhost:4317` | OTLP traces endpoint |
| `SERVICE_VERSION` | `0.1.0` | Service version |
| `ENVIRONMENT` | `development` | Deployment environment |

## Project Structure

```
accounts-java/
├── src/
│   ├── main/
│   │   ├── java/com/apollo/accounts/
│   │   │   ├── AccountsSubgraphApplication.java  # Spring Boot entry point
│   │   │   ├── config/
│   │   │   │   └── OpenTelemetryConfig.java      # OTel configuration
│   │   │   ├── datafetchers/
│   │   │   │   ├── QueryResolver.java            # Query operations
│   │   │   │   └── FederationResolver.java       # Federation reference resolution
│   │   │   ├── model/
│   │   │   │   ├── User.java                     # User entity
│   │   │   │   └── Product.java                  # Product reference
│   │   │   └── service/
│   │   │       └── AccountsService.java          # Business logic
│   │   └── resources/
│   │       ├── application.yml                   # Spring configuration
│   │       └── schema.graphqls                   # GraphQL schema
│   └── test/java/
├── pom.xml                                       # Maven dependencies
├── Dockerfile                                     # Container build
└── README.md                                      # This file
```

## GraphQL Operations

### Queries

```graphql
query {
  me {
    id
    name
    username
    email
  }
}

query {
  user(id: "1") {
    id
    name
    username
    email
  }
}

query {
  users {
    id
    name
    username
    email
  }
}

query {
  recommendedProducts {
    id
  }
}
```

### Federation

The User type is keyed by `id` and supports reference resolution through the `__resolveReference` mechanism for Apollo Federation.

## Health Checks

- **Liveness**: `GET http://localhost:4001/graphql?query={__typename}`
- **Readiness**: Same as liveness (GraphQL endpoint availability)
- **Spring Actuator**: `GET http://localhost:4001/actuator/health`

## OpenTelemetry Integration

- Traces are exported to Dash0 via OTLP/HTTP
- Sampling: Parent-based with 25% root sampling rate
- Service name: `accounts-subgraph`
- Includes W3C Trace Context propagation for distributed tracing

## Comparison with Node.js Version

| Aspect | Node.js | Java/Spring GraphQL |
|--------|---------|----------|
| Framework | Apollo Server | Spring GraphQL + Spring Boot |
| Language | JavaScript | Java |
| Startup time | ~500ms | ~2-3s |
| Memory footprint | ~50MB | ~150-200MB |
| Code lines | 106 | ~150 (distributed) |
| Type checking | Runtime (JavaScript) | Compile-time (Java) |
| Build tool | npm | Maven (wrapper included) |

## Future Enhancements

- [ ] Error injection framework (matching Node.js version)
- [ ] Caching layer (Redis)
- [ ] Database persistence (PostgreSQL)
- [ ] Additional test coverage
- [ ] Performance benchmarks

## Troubleshooting

### Port already in use
```bash
PORT=4005 ./mvnw spring-boot:run
```

### Build failures
```bash
./mvnw clean install
```

### GraphQL endpoint not responding
Check Spring Boot logs for startup issues or OTLP exporter connectivity.

## References

- [Spring GraphQL Documentation](https://spring.io/projects/spring-graphql)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Apollo Federation 2.0](https://www.apollographql.com/docs/federation/)
- [OpenTelemetry Java](https://opentelemetry.io/docs/instrumentation/java/)
- [Micrometer Tracing](https://micrometer.io/docs/tracing)
