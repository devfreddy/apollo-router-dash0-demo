"""
Products Subgraph - Python implementation with Apollo Federation
Simplified to match Node.js implementation for compatibility
"""
import os
from typing import List, Optional

# Initialize OpenTelemetry BEFORE any other imports
from otel import initialize_opentelemetry, instrument_asgi_app

initialize_opentelemetry('products-subgraph-py')

import strawberry
from strawberry.asgi import GraphQL
from strawberry.federation import Schema
from opentelemetry import trace, context
from opentelemetry.propagate import extract
from starlette.applications import Starlette
from starlette.middleware.base import BaseHTTPMiddleware
from error_injection import with_error_injection, ErrorInjectionException, should_inject_error, get_error_rate

# Get tracer
tracer = trace.get_tracer(__name__)


# Middleware to extract trace context from incoming requests
class TraceContextMiddleware(BaseHTTPMiddleware):
    """
    Extracts trace context from incoming requests (e.g., traceparent header from router)
    and sets it as the active context for the request.
    This ensures child spans are properly linked to parent spans.
    """
    async def dispatch(self, request, call_next):
        # Extract trace context from request headers
        ctx = extract(request.headers)
        token = context.attach(ctx)
        try:
            response = await call_next(request)
        finally:
            context.detach(token)
        return response


# ==================== Data Models ====================

# Sample product data (matches Node.js subgraph)
PRODUCTS_DATA = [
    {
        "id": "1",
        "name": "Galaxy Telescope Pro",
        "price": 899.99,
        "description": "Professional-grade telescope for deep space observation",
        "category": "Telescopes",
        "inStock": True,
    },
    {
        "id": "2",
        "name": "Nebula Binoculars",
        "price": 299.99,
        "description": "High-powered binoculars for stargazing",
        "category": "Binoculars",
        "inStock": True,
    },
    {
        "id": "3",
        "name": "Star Chart Deluxe",
        "price": 49.99,
        "description": "Comprehensive star chart with constellation guide",
        "category": "Books & Charts",
        "inStock": True,
    },
    {
        "id": "4",
        "name": "Cosmic Camera Mount",
        "price": 199.99,
        "description": "Motorized tracking mount for astrophotography",
        "category": "Accessories",
        "inStock": False,
    },
    {
        "id": "5",
        "name": "Lunar Landing Model Kit",
        "price": 79.99,
        "description": "Scale model of the Apollo 11 lunar lander",
        "category": "Models",
        "inStock": True,
    },
]


@strawberry.federation.type(keys=["id"])
class Product:
    """Product type for the federated schema (simplified)."""

    id: strawberry.ID
    name: str
    price: float
    description: Optional[str] = None
    category: Optional[str] = None
    in_stock: bool

    @classmethod
    def resolve_reference(cls, id: strawberry.ID, **kwargs) -> Optional["Product"]:
        """Resolve a product reference by ID for federation."""
        with tracer.start_as_current_span("__resolve_reference.Product") as span:
            span.set_attribute("product.id", str(id))

            for p in PRODUCTS_DATA:
                if p["id"] == id:
                    span.set_attribute("product.found", True)
                    return Product(
                        id=p["id"],
                        name=p["name"],
                        price=p["price"],
                        description=p["description"],
                        category=p["category"],
                        in_stock=p["inStock"],
                    )

            span.set_attribute("product.found", False)
            return None


@strawberry.type
class Query:
    """Root query type for the products subgraph."""

    @strawberry.field
    def products(self) -> List[Product]:
        """Get all products."""
        error_rate = get_error_rate('products-subgraph-py', 0)
        if should_inject_error(error_rate):
            raise ErrorInjectionException("Failed to fetch products")

        with tracer.start_as_current_span("query.products"):
            return [
                Product(
                    id=p["id"],
                    name=p["name"],
                    price=p["price"],
                    description=p["description"],
                    category=p["category"],
                    in_stock=p["inStock"],
                )
                for p in PRODUCTS_DATA
            ]

    @strawberry.field
    def product(self, id: strawberry.ID) -> Optional[Product]:
        """Get a single product by ID."""
        error_rate = get_error_rate('products-subgraph-py', 0)
        if should_inject_error(error_rate):
            raise ErrorInjectionException("Failed to fetch product")

        with tracer.start_as_current_span("query.product") as span:
            span.set_attribute("product.id", id)

            for p in PRODUCTS_DATA:
                if p["id"] == id:
                    return Product(
                        id=p["id"],
                        name=p["name"],
                        price=p["price"],
                        description=p["description"],
                        category=p["category"],
                        in_stock=p["inStock"],
                    )

            span.set_attribute("product.found", False)
            return None

    @strawberry.field
    def top_products(self, limit: int = 5) -> List[Product]:
        """Get top products (limited list)."""
        error_rate = get_error_rate('products-subgraph-py', 0)
        if should_inject_error(error_rate):
            raise ErrorInjectionException("Failed to fetch top products")

        with tracer.start_as_current_span("query.topProducts") as span:
            span.set_attribute("limit", limit)

            return [
                Product(
                    id=p["id"],
                    name=p["name"],
                    price=p["price"],
                    description=p["description"],
                    category=p["category"],
                    in_stock=p["inStock"],
                )
                for p in PRODUCTS_DATA[:limit]
            ]


# Create the schema with federation 2 enabled
schema = Schema(
    query=Query,
    enable_federation_2=True,
)

# Create the ASGI app using Starlette with GraphQL
graphql_app = GraphQL(schema)
app = Starlette()

# Add middleware to extract trace context from incoming requests
app.add_middleware(TraceContextMiddleware)
app.add_route("/graphql", graphql_app)
app.add_websocket_route("/graphql", graphql_app)

# Add OpenTelemetry instrumentation as OUTERMOST wrapper (AFTER setting up routes and other middleware)
app = instrument_asgi_app(app)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 4003))
    print(f"🚀 Products subgraph ready at http://localhost:{port}/graphql")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
