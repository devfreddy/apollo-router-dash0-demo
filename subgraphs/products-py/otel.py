"""
OpenTelemetry initialization for Python subgraph.
Provides manual span creation for GraphQL operations.
Includes trace context propagation for distributed tracing.
"""
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.propagate import set_global_textmap


def initialize_opentelemetry(service_name: str):
    """
    Initialize OpenTelemetry with core SDK only.
    Uses manual span creation in GraphQL resolvers for precise control.

    Args:
        service_name: The name of the service (e.g., 'products-subgraph-py')
    """
    environment = os.getenv('ENVIRONMENT', 'demo')
    service_version = os.getenv('SERVICE_VERSION', '1.0.0')
    auth_token = os.getenv('DASH0_AUTH_TOKEN')
    traces_endpoint = os.getenv('DASH0_TRACES_ENDPOINT')

    # Validate required configuration
    if not auth_token or not traces_endpoint:
        print('⚠️  OpenTelemetry configuration incomplete. Traces will not be exported.')
        print('   Required: DASH0_AUTH_TOKEN, DASH0_TRACES_ENDPOINT')

    # Configure resource with service information
    resource = Resource.create({
        "service.name": service_name,
        "service.version": service_version,
        "deployment.environment": environment,
    })

    # Configure trace exporter
    headers = {"Dash0-Dataset": "gtm-dash0"}
    if auth_token:
        headers["Authorization"] = auth_token
    trace_exporter = OTLPSpanExporter(
        endpoint=traces_endpoint if traces_endpoint else "http://localhost:4317/v1/traces",
        headers=headers,
    )

    # Configure tracer provider with trace exporter
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(tracer_provider)

    # Configure trace context propagation to extract parent spans from incoming requests
    # This enables the router's trace context (traceparent header) to be properly linked
    propagator = TraceContextTextMapPropagator()
    set_global_textmap(propagator)

    print(f'🔭 OpenTelemetry initialized for {service_name}')

    return tracer_provider
