import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider } from '@apollo/client'
import { init as initDash0 } from '@dash0/sdk-web'
import App from './App'
import './index.css'

// Make React available globally for JSX runtime
if (typeof window !== 'undefined') {
  (window as any).React = React
}

// Initialize Dash0 RUM Agent
initDash0({
  serviceName: 'willful-waste-website',
  serviceVersion: '1.0.0',
  environment: import.meta.env.VITE_ENVIRONMENT || 'production',
  endpoint: {
    url: import.meta.env.VITE_DASH0_ENDPOINT || 'http://localhost:4318',
    authToken: import.meta.env.VITE_DASH0_AUTH_TOKEN || '',
    ...(import.meta.env.VITE_DASH0_DATASET && { dataset: import.meta.env.VITE_DASH0_DATASET }),
  },
  // Include synthetic/bot traffic in RUM metrics
  // This allows load testing and monitoring tools to send data
  instrumentPageLoadTiming: true,
  instrumentResourceTiming: true,
  instrumentUserTiming: true,
})

// Initialize Apollo Client
// Use relative URL or environment variable for GraphQL endpoint
// This allows flexibility: relative path for same-origin requests,
// or explicit URL from environment for Kubernetes deployments
const graphqlUri = import.meta.env.VITE_GRAPHQL_URL || '/graphql'
const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: graphqlUri,
    credentials: 'same-origin',
  }),
  cache: new InMemoryCache(),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ApolloProvider client={apolloClient}>
    <App />
  </ApolloProvider>,
)
