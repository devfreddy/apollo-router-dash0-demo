import React from 'react'
import ReactDOM from 'react-dom/client'
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider } from '@apollo/client'
import App from './App'
import './index.css'

// Initialize Dash0 RUM Agent
if (typeof window !== 'undefined') {
  const script = document.createElement('script')
  script.src = 'https://cdn.dash0.com/js/rum/v1/dash0-rum.min.js'
  script.async = true
  script.onload = () => {
    if (window.Dash0) {
      window.Dash0.initialize({
        apiToken: import.meta.env.VITE_DASH0_API_TOKEN || '',
        environment: import.meta.env.VITE_ENVIRONMENT || 'production',
        version: '1.0.0',
        serviceName: 'willful-waste-website',
      })
    }
  }
  document.head.appendChild(script)
}

// Initialize Apollo Client
const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql',
    credentials: 'same-origin',
  }),
  cache: new InMemoryCache(),
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <App />
    </ApolloProvider>
  </React.StrictMode>,
)
