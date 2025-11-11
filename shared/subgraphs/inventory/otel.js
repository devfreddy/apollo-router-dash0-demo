const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { ParentBasedSampler, TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');

/**
 * Initialize OpenTelemetry instrumentation for a subgraph service
 * @param {string} serviceName - The name of the service (e.g., 'accounts-subgraph')
 * @returns {NodeSDK} The initialized OpenTelemetry SDK
 */
function initializeOpenTelemetry(serviceName) {
  const environment = process.env.ENVIRONMENT || 'demo';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const authToken = process.env.DASH0_AUTH_TOKEN;
  const tracesEndpoint = process.env.DASH0_TRACES_ENDPOINT;
  const metricsEndpoint = process.env.DASH0_METRICS_ENDPOINT;
  const dataset = process.env.DASH0_DATASET;

  // Validate required configuration
  if (!authToken || !tracesEndpoint || !metricsEndpoint || !dataset) {
    console.warn('⚠️  OpenTelemetry configuration incomplete. Telemetry data will not be exported.');
    console.warn('   Required: DASH0_AUTH_TOKEN, DASH0_TRACES_ENDPOINT, DASH0_METRICS_ENDPOINT, DASH0_DATASET');
  }

  // Configure resource with service information
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    'service.namespace': process.env.SERVICE_NAMESPACE || 'retail-services',
    [ATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': environment,
  });

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: tracesEndpoint,
    headers: {
      'Authorization': authToken,
      'Dash0-Dataset': dataset,
    },
  });

  // Configure metric exporter
  const metricExporter = new OTLPMetricExporter({
    url: metricsEndpoint,
    headers: {
      'Authorization': authToken,
      'Dash0-Dataset': dataset,
    },
  });

  // Initialize the OpenTelemetry SDK
  const sdk = new NodeSDK({
    resource: resource,
    traceExporter: traceExporter,
    // Use parent-based sampler to respect the router's sampling decision
    // If a parent span exists, use its sampling decision
    // If no parent, use TraceIdRatioBased sampler with 25% probability
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(0.25),
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 60000, // Export metrics every 60 seconds
    }),
    // Configure trace context propagation to extract parent spans from incoming requests
    // This enables the router's trace context (traceparent header) to be properly linked
    textMapPropagator: new W3CTraceContextPropagator(),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Enable only the instrumentations we need
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-graphql': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();
  console.log(`🔭 OpenTelemetry instrumentation initialized for ${serviceName}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.log('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

module.exports = { initializeOpenTelemetry };
