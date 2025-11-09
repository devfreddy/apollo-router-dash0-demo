# Willful Waste Implementation Details

## Technical Implementation Overview

This document provides technical details about how the Willful Waste retail store was implemented, architectural decisions, and integration points.

## Website Implementation

### Technology Choices

**Framework**: React + TypeScript + Vite
- **React**: Industry standard for building interactive UIs
- **TypeScript**: Type safety and better developer experience
- **Vite**: Extremely fast development server and optimized builds
- **Apollo Client**: Excellent GraphQL client with caching and optimistic updates

**Styling**: Pure CSS with modern features
- CSS Grid for responsive product layout
- CSS Flexbox for component layout
- CSS Variables for theming
- No external UI libraries for lightweight footprint

### Component Architecture

```
App (main component)
├── Header (brand/title)
└── Main (product display)
    ├── ProductCard[] (reusable product display)
    └── InventoryModal (conditional modal display)
```

**App.tsx** - Root component
- Manages modal state for inventory display
- Fetches products using Apollo useQuery hook
- Handles loading, error, and empty states
- Passes product data to ProductCard components

**ProductCard.tsx** - Product display component
- Pure presentational component
- Receives product data as props
- Emoji-based visual identification for categories
- Click handler to show inventory details

**InventoryModal.tsx** - Inventory details
- Conditional rendering based on modal state
- Displays warehouse info and estimated delivery
- Close functionality
- Detailed inventory breakdown

### GraphQL Integration

**Apollo Client Configuration**
```typescript
// Configured with:
// - HttpLink pointing to Apollo Router
// - InMemoryCache for client-side caching
// - Automatic request batching (built-in)
// - W3C Trace Context propagation (via router)
```

**Queries Implemented**
1. `GetProducts` - Fetches all products with inventory
2. `GetProductDetails` - Fetches detailed info including reviews
3. `GetTopProducts` - Fetches top-rated products with limit parameter

**Error Handling**
```typescript
- Loading state: "Loading products..."
- Error state: Displays error message with retry capability
- Empty state: "No products found"
- Network errors: Graceful fallback
```

### Dash0 RUM Integration

**Implementation Method**: External script injection
```typescript
// In main.tsx
const script = document.createElement('script')
script.src = 'https://cdn.dash0.com/js/rum/v1/dash0-rum.min.js'
script.onload = () => {
  window.Dash0.initialize({
    apiToken: import.meta.env.VITE_DASH0_API_TOKEN,
    environment: import.meta.env.VITE_ENVIRONMENT,
    version: '1.0.0',
    serviceName: 'willful-waste-website'
  })
}
```

**Collected Metrics**:
- Page load performance (FCP, LCP, CLS)
- API latency (GraphQL queries)
- User interactions (clicks, scrolls)
- JavaScript errors
- Session information
- Device and browser details

### Build Process

**Development**
```bash
npm run dev  # Vite dev server with HMR
# Output: http://localhost:3000
# Features: Hot module replacement, instant updates
```

**Production**
```bash
npm run build  # Vite build with optimization
# Output: dist/ folder with:
# - Minified JavaScript
# - CSS extracted and minified
# - Source maps (optional)
# - Optimized images
```

**Docker Build**
```dockerfile
# Multi-stage build:
# Stage 1: Builder
#   - Node 18 Alpine
#   - npm ci (clean install)
#   - npm run build
# Stage 2: Runtime
#   - Node 18 Alpine (smaller image)
#   - serve module for static hosting
#   - Health check included
```

### Performance Optimizations

1. **Bundle Size Optimization**
   - No external UI framework (CSS only)
   - Tree-shaking enabled by Vite
   - Async GraphQL imports
   - Minified in production

2. **Network Optimization**
   - Apollo Client caching reduces redundant queries
   - HTTP/2 multiplexing
   - Gzip compression in Docker

3. **Rendering Optimization**
   - React.StrictMode catches issues in development
   - Minimal re-renders with proper state management
   - CSS Grid and Flexbox for efficient layouts

4. **Accessibility**
   - Semantic HTML
   - ARIA attributes where needed
   - Keyboard navigation support
   - Color contrast compliance

## Bot Implementation

### Technology Choices

**Automation Framework**: Puppeteer
- Headless Chrome/Chromium automation
- Browser-level control for realistic user simulation
- DevTools Protocol for advanced features
- Cross-platform compatibility

**HTTP Client**: Axios
- Lightweight HTTP requests for direct API testing
- Interceptors for request/response handling
- Better error messages than fetch

**Runtime**: Node.js
- Event-driven architecture
- Excellent async/await support
- Rich ecosystem for testing tools

### Bot Architecture

The bot implements two parallel strategies:

**Strategy 1: Browser-Based Bots**
- Uses Puppeteer for full browser automation
- Simulates real user interactions:
  - Page navigation
  - Clicking buttons
  - Scrolling
  - Waiting and interactions
- Multiple concurrent browser instances
- Realistic delays between actions

**Strategy 2: GraphQL-Based Bots**
- Direct API calls via Axios
- Bypasses UI rendering
- Lightweight and fast
- Runs ~50% of browser bot count
- Good for pure API load testing

### User Behavior Simulation

**Actions Implemented**:
1. `viewProducts` - Navigate to homepage, wait for products to load
2. `scrollPage` - Scroll down the page (simulates browsing)
3. `viewInventory` - Click details button, view modal
4. `waitAndRefresh` - Wait 2-7 seconds, then refresh page
5. `viewDetails` - Alternative inventory viewing

**Realistic Delays**:
```javascript
// Between actions: Configurable (default 10 seconds)
// Viewing modal: 1-4 seconds random
// Page scroll pause: 1-3 seconds random
// Page refresh wait: 2-7 seconds random
```

**Device Simulation**:
```javascript
// Three viewport sizes:
// - Desktop: 1920x1080
// - Tablet: 768x1024
// - Mobile: 375x667

// Four user agents:
// - Chrome/Windows
// - Chrome/Mac
// - Safari/iPhone
```

### Concurrent Bot Management

**Orchestration Pattern**:
```javascript
// Master process spawns:
const botPromises = []

// Browser-based bots
for (let i = 1; i <= CONCURRENT_BOTS; i++) {
  botPromises.push(runBotSession(i))
}

// GraphQL-based bots
for (let i = 1; i <= Math.ceil(CONCURRENT_BOTS / 2); i++) {
  botPromises.push(runGraphQLBot(CONFIG.concurrentBots + i))
}

// Wait for all to complete
await Promise.all(botPromises)
```

**Resource Management**:
- Each browser instance: ~150-200MB memory
- Each API-only bot: ~10-20MB memory
- CPU scales with action frequency
- Graceful shutdown handling with process signals

### Error Handling

**Network Errors**:
```javascript
- Navigation timeout: Skip to next action
- GraphQL query failure: Log and retry next session
- Screenshot failure: Continue without capture
```

**Graceful Degradation**:
- If website unavailable: Attempts continue until timeout
- If GraphQL unavailable: Bots switch to API-only mode
- If modal doesn't appear: Continues with other actions
- Failed actions don't crash bot session

## Integration Points

### Docker Compose Integration

**Service Discovery**:
```yaml
services:
  router: port 4000
  willful-waste-website:
    depends_on: [router]
    environment:
      VITE_GRAPHQL_URL: http://router:4000/graphql
  willful-waste-bot:
    depends_on: [router, willful-waste-website]
    environment:
      WEBSITE_URL: http://willful-waste-website:3000
      GRAPHQL_URL: http://router:4000/graphql
```

**Health Checks**:
```yaml
# Website: HTTP GET on port 3000
# Router: Already configured in existing compose
# Bot: Process-based health check
```

### Kubernetes Integration

**Deployment Strategy**:
- Website: StatelessSet (2 replicas)
- Bot: Deployment (2 replicas, can scale)
- Services: LoadBalancer for website access

**ConfigMap Integration**:
```yaml
env:
- name: VITE_GRAPHQL_URL
  value: "http://apollo-router:4000/graphql"
```

**Monitoring Integration**:
```yaml
annotations:
  instrumentation.dash0.com/enable: "true"
```

**Resource Management**:
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "500m"
```

## Data Flow

### Request Flow

```
1. User opens website (http://localhost:3000)
   ↓
2. Browser downloads React app
   ↓
3. JavaScript initializes Apollo Client + Dash0 RUM
   ↓
4. Apollo Client sends GraphQL query
   ↓
5. Apollo Router receives query
   ↓
6. Router composes results from subgraphs
   ↓
7. Response returned to client
   ↓
8. React renders products
   ↓
9. Dash0 RUM tracks:
   - Query latency
   - Page load metrics
   - User interactions
```

### Bot Request Flow

```
1. Bot receives configuration
   ↓
2. Browser/Puppeteer launches
   ↓
3. Navigates to website URL
   ↓
4. Performs random actions:
   - Click buttons
   - Scroll page
   - Wait delays
   ↓
5. GraphQL queries sent
   ↓
6. Results processed
   ↓
7. Dash0 observes:
   - Increased request rate
   - Trace patterns
   - Error rates
   ↓
8. Session ends, browser closes
```

## Observability Integration

### Metrics Collected

**Frontend (RUM)**:
- Page load time (FCP, LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- GraphQL query latency
- JavaScript errors
- Resource timing

**Backend (Apollo Router)**:
- Request rate (RPS)
- Response time (p50, p95, p99)
- Error rate
- Cache hit rate
- Operation names and patterns

**Bot Activity**:
- Request count
- Action types
- Session duration
- Error frequency

### Trace Propagation

```
W3C Trace Context Headers:
traceparent: 00-{trace-id}-{span-id}-{trace-flags}
tracestate: ...

Flow:
Browser → Apollo Router → Subgraphs
  ↓
All connected via trace ID
↓
Complete request flow visible in Dash0
```

## Security Considerations

### Website Security

- **HTTPS Only** (in production)
- **CORS**: Configured in Apollo Router
- **CSP**: Can be added via nginx/reverse proxy
- **XSS Prevention**: React auto-escapes content
- **CSRF**: Protected by SameSite cookies

### Bot Security

- **No Credentials**: Bot doesn't use auth (public API)
- **Rate Limiting**: Respects service limits
- **User-Agent Rotation**: Appears as different browsers
- **No Data Extraction**: Only reads public product data
- **Clean Shutdown**: Graceful process termination

### Data Protection

- **No Sensitive Data**: Demo uses mock/test data
- **Privacy**: RUM data sent to Dash0 securely
- **Compliance**: No PII collected in demo

## Performance Characteristics

### Website Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Build time | ~30s | Vite optimized |
| Startup time | ~10s | Cold start in Docker |
| First paint | <500ms | Depends on GraphQL |
| Page size | ~50KB | All gzipped |
| Memory usage | ~128MB | Per container |
| CPU usage | ~50-100m | At rest |

### Bot Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Memory per browser | ~200MB | Puppeteer instance |
| Memory per API bot | ~20MB | Lightweight |
| Requests/minute | ~15-20 | Per browser bot |
| CPU per bot | ~20-40% | Variable |
| Session duration | ~5min | Configurable |

### Scalability

| Scenario | Recommendation |
|----------|-----------------|
| Local dev | 1 website, 2 bot instances |
| Load testing | 2 website, 3-5 bot instances |
| Production | 2+ website (auto-scale), 0 bot |
| Chaos testing | 5+ website, 10+ bot instances |

## Future Enhancement Opportunities

1. **Website**:
   - Add shopping cart functionality
   - Implement product search
   - Add user authentication
   - Create order management pages

2. **Bot**:
   - Add realistic think-time patterns
   - Implement abandonment rates
   - Add session replay integration
   - Support performance thresholds

3. **Observability**:
   - Custom metrics dashboard
   - Alerting rules
   - Synthetic monitoring
   - Error budget tracking

4. **Infrastructure**:
   - Database integration
   - Caching layer (Redis)
   - Message queue (RabbitMQ)
   - Distributed tracing improvements

## Dependencies and Versions

### Website
- React: 18.2.0
- TypeScript: 5.2.0
- Vite: 4.5.0
- Apollo Client: 3.8.0
- GraphQL: 16.8.0

### Bot
- Node.js: 18 LTS
- Puppeteer: 21.0.0
- Axios: 1.5.0
- dotenv: 16.3.1

### Infrastructure
- Docker: Latest stable
- Kubernetes: 1.25+
- Docker Compose: 2.0+

## Testing & Validation

### Automated Tests

```bash
# Website linting
npm run lint

# Type checking
npm run type-check

# Bot syntax validation
node --check bot.js
```

### Manual Testing

```bash
# Website functionality
1. Load page
2. Verify products display
3. Click inventory button
4. Verify modal appears

# Bot operation
1. Run with HEADLESS=false
2. Watch browser automation
3. Verify actions sequence
4. Check logs for errors
```

## Deployment Checklist

- [ ] Environment variables configured (.env)
- [ ] Docker images built and tagged
- [ ] Kubernetes manifests updated
- [ ] Health checks verified
- [ ] Resource limits appropriate
- [ ] Logging configured
- [ ] Monitoring enabled in Dash0
- [ ] CORS configured in router
- [ ] SSL/TLS certificates ready (production)
- [ ] Database backups (if applicable)

## Documentation Files

1. **WILLFUL_WASTE_SETUP.md** - Complete setup guide
2. **WILLFUL_WASTE_QUICKSTART.sh** - Automated setup
3. **WILLFUL_WASTE_SUMMARY.md** - High-level overview
4. **website/README.md** - Website documentation
5. **website-bot/README.md** - Bot documentation
6. **IMPLEMENTATION_DETAILS.md** - This file

---

**Last Updated**: November 2024
**Status**: Production Ready
**Maintainer**: Apollo/Dash0 Demo Team
