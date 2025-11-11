"""
OpenTelemetry initialization for Python subgraph.
Provides manual span creation for GraphQL operations.
Includes trace context propagation for distributed tracing.
Exports both traces and metrics to Dash0.
"""
import os
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.propagate import set_global_textmap
from opentelemetry.instrumentation.asgi import OpenTelemetryMiddleware
from opentelemetry.instrumentation.requests import RequestsInstrumentor


def initialize_opentelemetry(service_name: str):
    """
    Initialize OpenTelemetry with traces and metrics export.
    Uses manual span creation in GraphQL resolvers for precise control.

    Args:
        service_name: The name of the service (e.g., 'products-subgraph-py')
    """
    environment = os.getenv('ENVIRONMENT', 'demo')
    service_version = os.getenv('SERVICE_VERSION', '1.0.0')
    auth_token = os.getenv('DASH0_AUTH_TOKEN')
    traces_endpoint = os.getenv('DASH0_TRACES_ENDPOINT')
    metrics_endpoint = os.getenv('DASH0_METRICS_ENDPOINT')
    dataset = os.getenv('DASH0_DATASET')

    # Validate required configuration
    if not auth_token or not traces_endpoint or not metrics_endpoint or not dataset:
        print('⚠️  OpenTelemetry configuration incomplete. Telemetry data will not be exported.')
        print('   Required: DASH0_AUTH_TOKEN, DASH0_TRACES_ENDPOINT, DASH0_METRICS_ENDPOINT, DASH0_DATASET')

    # Configure resource with service information
    resource = Resource.create({
        "service.name": service_name,
        "service.namespace": os.getenv('SERVICE_NAMESPACE', 'retail-services'),
        "service.version": service_version,
        "deployment.environment": environment,
    })

    # Configure exporters with authentication headers
    headers = {"Dash0-Dataset": dataset}
    if auth_token:
        headers["Authorization"] = auth_token

    # Configure trace exporter
    trace_exporter = OTLPSpanExporter(
        endpoint=traces_endpoint if traces_endpoint else "http://localhost:4317/v1/traces",
        headers=headers,
    )

    # Configure metric exporter
    metric_exporter = OTLPMetricExporter(
        endpoint=metrics_endpoint if metrics_endpoint else "http://localhost:4317/v1/metrics",
        headers=headers,
    )

    # Configure tracer provider with parent-based sampler to respect the router's sampling decision
    # If a parent span exists, use its sampling decision
    # If no parent, use TraceIdRatioBased sampler with 25% probability
    tracer_provider = TracerProvider(
        resource=resource,
        sampler=ParentBased(root=TraceIdRatioBased(0.25))
    )
    tracer_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
    trace.set_tracer_provider(tracer_provider)

    # Configure meter provider with metric exporter
    metric_reader = PeriodicExportingMetricReader(
        exporter=metric_exporter,
        export_interval_millis=60000,  # Export metrics every 60 seconds
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Configure trace context propagation to extract parent spans from incoming requests
    # This enables the router's trace context (traceparent header) to be properly linked
    propagator = TraceContextTextMapPropagator()
    set_global_textmap(propagator)

    # Initialize RequestsInstrumentor for outbound HTTP calls
    RequestsInstrumentor().instrument()

    print(f'🔭 OpenTelemetry initialized for {service_name}')

    return tracer_provider


def instrument_asgi_app(app):
    """
    Wrap a Starlette/ASGI app with OpenTelemetry instrumentation middleware.
    This captures all incoming HTTP requests as spans.

    Args:
        app: The Starlette application to instrument

    Returns:
        The instrumented app wrapped with OpenTelemetryMiddleware
    """
    return OpenTelemetryMiddleware(app)
