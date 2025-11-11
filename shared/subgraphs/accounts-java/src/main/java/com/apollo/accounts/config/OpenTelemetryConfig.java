package com.apollo.accounts.config;

import org.springframework.context.annotation.Configuration;

/**
 * OpenTelemetry configuration for Dash0 integration.
 *
 * Configuration is handled via application.yml properties:
 * - management.otlp.tracing.endpoint: DASH0_TRACES_ENDPOINT
 * - management.otlp.headers: Authorization header with DASH0_AUTH_TOKEN and Dash0-Dataset
 *
 * Spring Boot auto-configures OpenTelemetry tracing through Micrometer when
 * opentelemetry-exporter-otlp is on the classpath.
 */
@Configuration
public class OpenTelemetryConfig {
    // Configuration is handled via Spring Boot properties in application.yml
}
