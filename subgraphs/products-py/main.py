"""
Products Subgraph - Python implementation with Apollo Federation
Expanded with more complex schema and detailed instrumentation
"""
import os
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

# Initialize OpenTelemetry BEFORE any other imports
from otel import initialize_opentelemetry

initialize_opentelemetry('products-subgraph-py')

import strawberry
from strawberry.asgi import GraphQL
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

@strawberry.type
class Specification:
    """Technical specifications for a product."""

    key: str
    value: str


@strawberry.type
class Manufacturer:
    """Manufacturer information."""

    id: strawberry.ID
    name: str
    country: str
    founded_year: int


@strawberry.type
class ProductDimensions:
    """Physical dimensions of a product."""

    length_cm: float
    width_cm: float
    height_cm: float
    weight_kg: float


@strawberry.type
class PriceHistory:
    """Historical price data for a product."""

    date: str
    price: float
    discount_percent: Optional[float] = None


@strawberry.type
class Product:
    """Product type for the federated schema."""

    id: strawberry.ID
    name: str
    price: float
    description: Optional[str] = None
    category: Optional[str] = None
    in_stock: bool
    sku: str
    manufacturer: Manufacturer
    dimensions: ProductDimensions
    specifications: List[Specification]
    available_colors: List[str]
    warranty_months: int
    rating: Optional[float] = None
    price_history: List[PriceHistory]


# Sample manufacturer data
MANUFACTURERS_DATA = {
    "mfg-1": {"id": "mfg-1", "name": "CelestialOptics Inc.", "country": "USA", "founded_year": 1985},
    "mfg-2": {"id": "mfg-2", "name": "StarGaze Instruments", "country": "Germany", "founded_year": 1950},
    "mfg-3": {"id": "mfg-3", "name": "AstroTech Solutions", "country": "Japan", "founded_year": 1995},
}

# Expanded product data
PRODUCTS_DATA = [
    {
        "id": "1",
        "name": "Galaxy Telescope Pro",
        "price": 899.99,
        "description": "Professional-grade telescope for deep space observation",
        "category": "Telescopes",
        "in_stock": True,
        "sku": "TEL-GAL-PRO-001",
        "manufacturer_id": "mfg-1",
        "dimensions": {
            "length_cm": 120.0,
            "width_cm": 15.0,
            "height_cm": 15.0,
            "weight_kg": 8.5,
        },
        "specifications": [
            {"key": "Aperture", "value": "200mm"},
            {"key": "Focal Length", "value": "2000mm"},
            {"key": "Magnification", "value": "40x to 200x"},
        ],
        "available_colors": ["Black", "White", "Silver"],
        "warranty_months": 24,
        "rating": 4.8,
    },
    {
        "id": "2",
        "name": "Nebula Binoculars",
        "price": 299.99,
        "description": "High-powered binoculars for stargazing",
        "category": "Binoculars",
        "in_stock": True,
        "sku": "BIN-NEB-PRO-001",
        "manufacturer_id": "mfg-2",
        "dimensions": {
            "length_cm": 18.0,
            "width_cm": 14.0,
            "height_cm": 12.0,
            "weight_kg": 1.2,
        },
        "specifications": [
            {"key": "Magnification", "value": "10x"},
            {"key": "Objective Lens", "value": "50mm"},
            {"key": "Field of View", "value": "6.5°"},
        ],
        "available_colors": ["Black", "Camouflage"],
        "warranty_months": 12,
        "rating": 4.6,
    },
    {
        "id": "3",
        "name": "Star Chart Deluxe",
        "price": 49.99,
        "description": "Comprehensive star chart with constellation guide",
        "category": "Books & Charts",
        "in_stock": True,
        "sku": "CHT-STAR-DLX-001",
        "manufacturer_id": "mfg-1",
        "dimensions": {
            "length_cm": 86.0,
            "width_cm": 61.0,
            "height_cm": 0.5,
            "weight_kg": 0.3,
        },
        "specifications": [
            {"key": "Format", "value": "Laminated Poster"},
            {"key": "Languages", "value": "English, German, French"},
            {"key": "Scale", "value": "1:500,000,000"},
        ],
        "available_colors": ["Standard"],
        "warranty_months": 6,
        "rating": 4.4,
    },
    {
        "id": "4",
        "name": "Cosmic Camera Mount",
        "price": 199.99,
        "description": "Motorized tracking mount for astrophotography",
        "category": "Accessories",
        "in_stock": False,
        "sku": "ACC-CAM-MTN-001",
        "manufacturer_id": "mfg-3",
        "dimensions": {
            "length_cm": 45.0,
            "width_cm": 50.0,
            "height_cm": 40.0,
            "weight_kg": 15.0,
        },
        "specifications": [
            {"key": "Motor Type", "value": "Stepper Motor"},
            {"key": "Max Load", "value": "30kg"},
            {"key": "Power Supply", "value": "110-240V AC or Battery"},
        ],
        "available_colors": ["Black"],
        "warranty_months": 36,
        "rating": 4.7,
    },
    {
        "id": "5",
        "name": "Lunar Landing Model Kit",
        "price": 79.99,
        "description": "Scale model of the Apollo 11 lunar lander",
        "category": "Models",
        "in_stock": True,
        "sku": "KIT-LUNAR-11-001",
        "manufacturer_id": "mfg-2",
        "dimensions": {
            "length_cm": 30.0,
            "width_cm": 25.0,
            "height_cm": 20.0,
            "weight_kg": 0.5,
        },
        "specifications": [
            {"key": "Scale", "value": "1:48"},
            {"key": "Parts", "value": "250+ pieces"},
            {"key": "Assembly Time", "value": "8-12 hours"},
        ],
        "available_colors": ["Silver/Gold"],
        "warranty_months": 3,
        "rating": 4.9,
    },
]


# Generate price history for each product
def generate_price_history(current_price: float, product_id: str) -> List[dict]:
    """Generate 12 months of price history."""
    history = []
    base_price = current_price * 1.15  # Assume current price is discounted

    for i in range(11, -1, -1):
        date = datetime.now() - timedelta(days=30*i)
        # Simulate some price variations
        price = base_price * (0.95 + (hash(product_id + str(i)) % 10) / 100)
        discount = max(0, ((base_price - price) / base_price) * 100) if price < base_price else 0

        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": round(price, 2),
            "discount_percent": discount if discount > 0.5 else None,
        })

    return history


# Enrich products with generated data
def get_enriched_product(product: dict) -> dict:
    """Add generated data to product."""
    product_copy = product.copy()
    product_copy["price_history"] = generate_price_history(product["price"], product["id"])
    return product_copy


def get_manufacturer(manufacturer_id: str) -> Optional[Manufacturer]:
    """Get manufacturer by ID."""
    if manufacturer_id in MANUFACTURERS_DATA:
        mfg = MANUFACTURERS_DATA[manufacturer_id]
        return Manufacturer(
            id=mfg["id"],
            name=mfg["name"],
            country=mfg["country"],
            founded_year=mfg["founded_year"],
        )
    return None


def product_dict_to_object(p: dict) -> Product:
    """Convert product dict to Product object with all related data."""
    return Product(
        id=p["id"],
        name=p["name"],
        price=p["price"],
        description=p["description"],
        category=p["category"],
        in_stock=p["in_stock"],
        sku=p["sku"],
        manufacturer=get_manufacturer(p["manufacturer_id"]),
        dimensions=ProductDimensions(**p["dimensions"]),
        specifications=[Specification(**s) for s in p["specifications"]],
        available_colors=p["available_colors"],
        warranty_months=p["warranty_months"],
        rating=p.get("rating"),
        price_history=[PriceHistory(**ph) for ph in p["price_history"]],
    )


@strawberry.type
class Query:
    """Root query type for the products subgraph."""

    @strawberry.field
    def products(self) -> List[Product]:
        """Get all products."""
        if should_inject_error(5):
            raise ErrorInjectionException("Failed to fetch products")

        with tracer.start_as_current_span("query.products"):
            enriched = [get_enriched_product(p) for p in PRODUCTS_DATA]
            return [product_dict_to_object(p) for p in enriched]

    @strawberry.field
    def product(self, id: strawberry.ID) -> Optional[Product]:
        """Get a single product by ID."""
        if should_inject_error(5):
            raise ErrorInjectionException("Failed to fetch product")

        with tracer.start_as_current_span("query.product") as span:
            span.set_attribute("product.id", id)

            for p in PRODUCTS_DATA:
                if p["id"] == id:
                    enriched = get_enriched_product(p)
                    return product_dict_to_object(enriched)

            span.set_attribute("product.found", False)
            return None

    @strawberry.field
    def top_products(self, limit: int = 5) -> List[Product]:
        """Get top products (limited list)."""
        if should_inject_error(5):
            raise ErrorInjectionException("Failed to fetch top products")

        with tracer.start_as_current_span("query.topProducts") as span:
            span.set_attribute("limit", limit)

            enriched = [get_enriched_product(p) for p in PRODUCTS_DATA[:limit]]
            return [product_dict_to_object(p) for p in enriched]

    @strawberry.field
    def products_by_category(self, category: str) -> List[Product]:
        """Get products filtered by category."""
        if should_inject_error(5):
            raise ErrorInjectionException("Failed to fetch products by category")

        with tracer.start_as_current_span("query.productsByCategory") as span:
            span.set_attribute("category", category)

            matching = [
                p for p in PRODUCTS_DATA
                if p["category"].lower() == category.lower()
            ]

            enriched = [get_enriched_product(p) for p in matching]
            return [product_dict_to_object(p) for p in enriched]

    @strawberry.field
    def products_in_stock(self) -> List[Product]:
        """Get all products currently in stock."""
        if should_inject_error(5):
            raise ErrorInjectionException("Failed to fetch products in stock")

        with tracer.start_as_current_span("query.productsInStock"):
            in_stock = [p for p in PRODUCTS_DATA if p["in_stock"]]
            enriched = [get_enriched_product(p) for p in in_stock]
            return [product_dict_to_object(p) for p in enriched]

    @strawberry.field
    def search_products(self, query: str) -> List[Product]:
        """Search products by name or description."""
        if should_inject_error(5):
            raise ErrorInjectionException("Failed to search products")

        with tracer.start_as_current_span("query.searchProducts") as span:
            span.set_attribute("search.query", query)
            query_lower = query.lower()

            results = [
                p for p in PRODUCTS_DATA
                if query_lower in p["name"].lower() or
                   query_lower in (p.get("description") or "").lower()
            ]

            span.set_attribute("search.results", len(results))
            enriched = [get_enriched_product(p) for p in results]
            return [product_dict_to_object(p) for p in enriched]


# Create the schema
schema = strawberry.federation.Schema(
    query=Query,
)

# Create the ASGI app using Starlette with GraphQL
graphql_app = GraphQL(schema)
app = Starlette()
# Add middleware to extract trace context from incoming requests
app.add_middleware(TraceContextMiddleware)
app.add_route("/graphql", graphql_app)
app.add_websocket_route("/graphql", graphql_app)

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 4003))
    print(f"🚀 Products subgraph ready at http://localhost:{port}/graphql")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
