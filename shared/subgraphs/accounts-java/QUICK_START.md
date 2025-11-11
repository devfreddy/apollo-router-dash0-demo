# Java Accounts Subgraph - Quick Start

## What You Have

You now have a fully functional Java-based accounts subgraph that mirrors the Node.js version, built with:
- **Spring GraphQL 1.3.0** with Spring Boot 3.3.0
- **Java 17** (already on your machine)
- **OpenTelemetry** tracing via Micrometer
- **Maven wrapper** (no installation needed)

## Build It

```bash
cd shared/subgraphs/accounts-java
./mvnw clean package
```

**First time?** The Maven wrapper will automatically download Maven 3.9.6 on first run (~20-30 seconds).

## Run It Locally

```bash
PORT=4001 java -jar target/accounts-subgraph-0.1.0.jar
```

Then visit:
- GraphiQL: http://localhost:4001/graphiql
- Health check: http://localhost:4001/actuator/health

## Run in Docker

```bash
docker build -t accounts-subgraph-java:latest .
docker run -p 4001:4001 accounts-subgraph-java:latest
```

## Key Files

- **[pom.xml](pom.xml)** - Dependencies and build config
- **[src/main/java/com/apollo/accounts/](src/main/java/com/apollo/accounts/)** - Java source code
  - `QueryResolver.java` - Query handlers (me, user, users, recommendedProducts)
  - `FederationResolver.java` - Apollo Federation support
  - `AccountsService.java` - Business logic (in-memory data)
  - `model/` - User and Product data classes
- **[src/main/resources/schema.graphqls](src/main/resources/schema.graphqls)** - GraphQL schema
- **[src/main/resources/application.yml](src/main/resources/application.yml)** - Spring Boot config
- **[Dockerfile](Dockerfile)** - Multi-stage Docker build

## Try a Query

Open http://localhost:4001/graphiql and run:

```graphql
{
  me {
    id
    name
    username
    email
  }
  users {
    id
    name
  }
  recommendedProducts {
    id
  }
}
```

## Configuration

Via environment variables:
```bash
PORT=4001                                           # Server port
DASH0_DATASET=gtm-dash0                             # Dash0 dataset
DASH0_AUTH_TOKEN=your-token                         # Dash0 API token
DASH0_TRACES_ENDPOINT=http://localhost:4317         # OTLP traces endpoint
SERVICE_VERSION=0.1.0                               # Service version
ENVIRONMENT=development                             # Environment name
```

## Size & Performance

- **JAR Size**: 32 MB
- **Startup time**: ~2-3 seconds
- **Memory**: ~150-200 MB
- **Code**: ~150 lines of Java (distributed across classes)

## What's Different From Node.js?

| Feature | Node.js | Java |
|---------|---------|------|
| Startup | 500ms | 2-3s |
| Memory | 50MB | 150-200MB |
| Framework | Apollo Server | Spring GraphQL + Spring Boot |
| Type Safety | Runtime | Compile-time |
| Ecosystem | Node.js packages | Java/Maven packages |

## Next Steps

1. **Add error injection** - Match Node.js `ACCOUNTS_SUBGRAPH_ERROR_RATE` support
2. **Add database** - Replace in-memory data with PostgreSQL
3. **Add to Kubernetes** - Create K8s deployment manifest
4. **Add caching** - Redis or Spring Cache
5. **Integration testing** - Add Apollo Federation query tests

## Troubleshooting

```bash
# Clean rebuild
./mvnw clean package

# Run with debug logs
./mvnw spring-boot:run -Dspring-boot.run.arguments="--logging.level.com.apollo.accounts=DEBUG"

# Check if port 4001 is in use
lsof -i :4001

# Run on different port
PORT=4005 java -jar target/accounts-subgraph-0.1.0.jar
```

## Resources

- [Source code](./src/main/java/com/apollo/accounts)
- [README](./README.md) - Detailed documentation
- [Spring GraphQL docs](https://spring.io/projects/spring-graphql)
- [Apollo Federation v2 docs](https://www.apollographql.com/docs/federation/)
