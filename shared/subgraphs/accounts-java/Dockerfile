# Build stage
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copy POM and source
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copy the built JAR from builder
COPY --from=builder /build/target/accounts-subgraph-*.jar app.jar

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-4001}/graphql?query=\{__typename\} || exit 1

EXPOSE ${PORT:-4001}

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
