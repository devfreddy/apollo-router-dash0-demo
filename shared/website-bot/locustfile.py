#!/usr/bin/env python3
"""
Locust-based load test for Apollo Router with Playwright for RUM metrics
- ApolloRouterBrowserUser: Playwright-based browser for realistic RUM telemetry (ACTIVE)
- ApolloRouterUser: HTTP-based GraphQL queries (disabled by default, can be enabled)
- Collects Web Vitals, page load metrics, and user interaction data
- Full OpenTelemetry instrumentation for traces, metrics, and logs
"""

import json
import os
import random
import uuid
import logging
from locust import HttpUser, task, between
from locust_plugins.users.playwright import PlaywrightUser, pw, PageWithRetry

from opentelemetry import context, baggage, trace
from opentelemetry.context import Context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor

# Configure tracer provider
tracer_provider = TracerProvider()
trace.set_tracer_provider(tracer_provider)

# Get OTLP endpoint from environment, default to localhost
otlp_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
try:
    tracer_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)))
except Exception as e:
    logging.warning(f"Could not connect to OTLP exporter at {otlp_endpoint}: {e}")

# Configure logger provider
logger_provider = LoggerProvider()
set_logger_provider(logger_provider)

try:
    log_exporter = OTLPLogExporter(endpoint=otlp_endpoint, insecure=True)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
except Exception as e:
    logging.warning(f"Could not connect to OTLP log exporter: {e}")

# Create logging handler with trace context
handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
root_logger = logging.getLogger()
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

# Instrument requests to auto-trace HTTP calls
LoggingInstrumentor().instrument(set_logging_format=True)
RequestsInstrumentor().instrument()

logging.info("OpenTelemetry instrumentation initialized")

# GraphQL queries for HTTP user
GRAPHQL_QUERIES = {
    "topProducts": {
        "query": """
            query {
                topProducts {
                    id
                    name
                    price
                    inStock
                }
            }
        """
    },
    "reviews": {
        "query": """
            query {
                reviews {
                    id
                    body
                    rating
                }
            }
        """
    },
    "inventory": {
        "query": """
            query {
                topProducts {
                    id
                    name
                    inventory {
                        quantity
                    }
                }
            }
        """
    },
}


class ApolloRouterUser(HttpUser):
    """
    HTTP-based user for GraphQL API load testing (DISABLED BY DEFAULT)
    Can be enabled by setting --classes=ApolloRouterUser in Locust
    """

    wait_time = between(2, 5)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tracer = trace.get_tracer(__name__)

    @task(5)
    def query_top_products(self):
        """Query top products"""
        with self.tracer.start_as_current_span("graphql_top_products"):
            try:
                self.client.post(
                    "/graphql",
                    json=GRAPHQL_QUERIES["topProducts"],
                    headers={"Content-Type": "application/json"}
                )
            except Exception as e:
                logging.error(f"GraphQL query failed: {e}")

    @task(3)
    def query_reviews(self):
        """Query reviews"""
        with self.tracer.start_as_current_span("graphql_reviews"):
            try:
                self.client.post(
                    "/graphql",
                    json=GRAPHQL_QUERIES["reviews"],
                    headers={"Content-Type": "application/json"}
                )
            except Exception as e:
                logging.error(f"GraphQL query failed: {e}")

    @task(2)
    def query_inventory(self):
        """Query inventory"""
        with self.tracer.start_as_current_span("graphql_inventory"):
            try:
                self.client.post(
                    "/graphql",
                    json=GRAPHQL_QUERIES["inventory"],
                    headers={"Content-Type": "application/json"}
                )
            except Exception as e:
                logging.error(f"GraphQL query failed: {e}")


class ApolloRouterBrowserUser(PlaywrightUser):
    """
    Playwright-based user for collecting RUM metrics
    - Generates realistic user traffic through a browser
    - Collects Web Vitals (LCP, FID, CLS)
    - Captures page load performance metrics
    - Generates user interaction telemetry
    - Much lighter than Puppeteer
    """

    headless = True
    wait_time_between_tasks = 5  # Wait 5 seconds between tasks

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.tracer = trace.get_tracer(__name__)

    def on_start(self):
        """Called when a user starts"""
        ctx = baggage.set_baggage("user_type", "browser")
        ctx = baggage.set_baggage("synthetic_request", "true", context=ctx)
        context.attach(ctx)
        logging.info("Browser user session started - collecting RUM metrics")

    @pw
    async def load_homepage(self, page: PageWithRetry):
        """Load homepage and collect Web Vitals"""
        with self.tracer.start_as_current_span("browser_load_homepage"):
            try:
                logging.info("Browser: loading homepage")
                await page.goto(f"{self.host}/", wait_until="networkidle")
                await page.wait_for_load_state("networkidle")
                logging.info("Browser: homepage loaded, Web Vitals collected")
            except Exception as e:
                logging.error(f"Browser error loading homepage: {e}")

    @pw
    async def view_products(self, page: PageWithRetry):
        """View products and scroll"""
        with self.tracer.start_as_current_span("browser_view_products"):
            try:
                logging.info("Browser: viewing products")
                await page.goto(f"{self.host}/products", wait_until="networkidle")
                # Simulate scrolling
                await page.evaluate("window.scrollBy(0, window.innerHeight)")
                await page.wait_for_timeout(2000)
                logging.info("Browser: products viewed")
            except Exception as e:
                logging.error(f"Browser error viewing products: {e}")

    @pw
    async def navigate_and_refresh(self, page: PageWithRetry):
        """Navigate and refresh to test page load metrics"""
        with self.tracer.start_as_current_span("browser_navigate_refresh"):
            try:
                logging.info("Browser: navigating and refreshing")
                await page.goto(f"{self.host}/", wait_until="domcontentloaded")
                await page.reload(wait_until="networkidle")
                logging.info("Browser: refresh complete, metrics collected")
            except Exception as e:
                logging.error(f"Browser error during navigation: {e}")

    @pw
    async def click_and_interact(self, page: PageWithRetry):
        """Interact with page elements"""
        with self.tracer.start_as_current_span("browser_interact"):
            try:
                logging.info("Browser: interacting with page")
                await page.goto(f"{self.host}/", wait_until="networkidle")
                # Try to find and click buttons/links
                buttons = await page.query_selector_all("button, a")
                if buttons:
                    await buttons[0].click()
                    await page.wait_for_load_state("networkidle")
                    logging.info("Browser: interaction complete")
            except Exception as e:
                logging.error(f"Browser error during interaction: {e}")
