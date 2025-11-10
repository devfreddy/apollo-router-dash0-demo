# Willful Waste Retail Store Website

A modern React-based retail website for the Willful Waste store, built with TypeScript, Vite, and Apollo Client. The website connects to the Apollo Router GraphQL gateway to display products and inventory information, with full Dash0 RUM (Real User Monitoring) instrumentation.

## Features

- **Product Catalog**: Browse a complete list of products with categories, prices, and descriptions
- **Inventory Management**: View real-time inventory information including quantities, warehouse locations, and estimated delivery dates
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **GraphQL Integration**: Uses Apollo Client to fetch data from the Apollo Router supergraph
- **Performance Monitoring**: Integrated with Dash0 RUM agent for comprehensive web performance observability
- **Modern UI**: Beautiful, interactive product cards with smooth animations

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   ├── ProductCard.tsx      # Product display component
│   │   └── InventoryModal.tsx   # Inventory details modal
│   ├── App.tsx                  # Main application component
│   ├── App.css                  # Application styles
│   ├── main.tsx                 # Application entry point
│   ├── index.css                # Global styles
│   └── queries.ts               # GraphQL queries
├── index.html                   # HTML template
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # NPM dependencies
├── Dockerfile                   # Container image definition
└── .env.example                 # Environment variables template
```

## Prerequisites

- Node.js 18+ and npm
- GraphQL endpoint (Apollo Router) running on `http://localhost:4000`
- Dash0 API token (for RUM monitoring)

## Installation & Development

### Local Development

```bash
# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Edit .env with your configuration
# VITE_GRAPHQL_URL=http://localhost:4000/graphql
# VITE_DASH0_API_TOKEN=your_token_here
# VITE_ENVIRONMENT=development

# Start development server
npm run dev
```

The website will be available at `http://localhost:3000`.

### Build for Production

```bash
# Build the application
npm run build

# Preview the production build
npm run preview
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GRAPHQL_URL` | GraphQL endpoint URL | `http://localhost:4000/graphql` |
| `VITE_DASH0_API_TOKEN` | Dash0 RUM API token | (optional) |
| `VITE_ENVIRONMENT` | Environment name | `development` |

## Docker

### Build Docker Image

```bash
docker build -t apollo-dash0-demo-willful-waste-website:latest .
```

### Run in Docker

```bash
docker run \
  -p 3000:3000 \
  -e VITE_GRAPHQL_URL="http://localhost:4000/graphql" \
  apollo-dash0-demo-willful-waste-website:latest
```

## Kubernetes Deployment

The website is configured for deployment to the Apollo Dash0 demo Kubernetes cluster via Kustomize.

### Deploy to Kubernetes

```bash
# From the project root
./kubernetes/scripts/k3d-up.sh
```

Or manually:

```bash
kubectl apply -k kubernetes/base
```

### Verify Deployment

```bash
# Check deployment status
kubectl get deployment -n apollo-dash0-demo willful-waste-website

# View logs
kubectl logs -f deployment/willful-waste-website -n apollo-dash0-demo

# Port forward to test locally
kubectl port-forward -n apollo-dash0-demo svc/willful-waste-website 3000:80
```

## GraphQL Queries

### Get All Products

```graphql
query GetProducts {
  products {
    id
    name
    price
    description
    category
    inStock
    inventory {
      quantity
      warehouse
      estimatedDelivery
    }
  }
}
```

### Get Product Details

```graphql
query GetProductDetails($id: ID!) {
  product(id: $id) {
    id
    name
    price
    description
    category
    inStock
    inventory {
      quantity
      warehouse
      estimatedDelivery
    }
    reviews {
      id
      rating
      body
      author {
        name
      }
    }
  }
}
```

### Get Top Products

```graphql
query GetTopProducts($limit: Int) {
  topProducts(limit: $limit) {
    id
    name
    price
    category
    inStock
  }
}
```

## Dash0 RUM Integration

The website is automatically instrumented with Dash0 RUM agent, which provides:

- **Page Load Performance**: Measures time to interactive and other core web vitals
- **API Call Monitoring**: Tracks GraphQL queries and HTTP requests
- **User Interactions**: Records clicks, scrolls, and navigation events
- **Error Tracking**: Captures JavaScript errors and stack traces
- **Session Analytics**: Groups events by user session

To view metrics:

1. Go to [Dash0 Dashboard](https://app.dash0.com)
2. Navigate to your dataset
3. Select "RUM" or "Frontend" views
4. Filter by service name: `willful-waste-website`

## Performance Optimization

The website includes several performance optimizations:

- **Code Splitting**: Routes are lazily loaded
- **Image Optimization**: Emoji-based product images reduce bandwidth
- **Caching**: Apollo Client caches GraphQL responses
- **Compression**: Production builds are minified and compressed
- **Bundle Analysis**: Can be analyzed with `npm run build`

## Troubleshooting

### GraphQL Connection Issues

If the website cannot connect to the GraphQL endpoint:

1. Verify the Apollo Router is running
2. Check `VITE_GRAPHQL_URL` in environment
3. Ensure CORS is properly configured in the router
4. Check browser console for specific error messages

### Dash0 RUM Not Loading

1. Verify `VITE_DASH0_API_TOKEN` is set
2. Check browser console for script load errors
3. Ensure Dash0 endpoint is accessible from your network
4. Check Dash0 token expiration in settings

### Performance Issues

1. Check browser DevTools Performance tab
2. Review Network tab for slow requests
3. Check Dash0 dashboard for backend latency
4. Consider increasing Kubernetes resource limits

## Contributing

When contributing to the website:

1. Follow TypeScript conventions
2. Add proper type definitions
3. Test responsiveness across devices
4. Verify GraphQL queries
5. Check performance impact

## License

Part of the Apollo Router Dash0 Demo project
