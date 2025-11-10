// Initialize OpenTelemetry BEFORE any other imports
const { initializeOpenTelemetry } = require('./otel');
initializeOpenTelemetry('products-subgraph');

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');
const { withErrorInjection } = require('../shared/error-injection');

// Get error rate from environment variable
const PRODUCTS_ERROR_RATE = parseInt(process.env.PRODUCTS_SUBGRAPH_ERROR_RATE || '0', 10);

// Sample product data
const products = [
  {
    id: '1',
    name: 'Galaxy Telescope Pro',
    price: 899.99,
    description: 'Professional-grade telescope for deep space observation',
    category: 'Telescopes',
    inStock: true,
  },
  {
    id: '2',
    name: 'Nebula Binoculars',
    price: 299.99,
    description: 'High-powered binoculars for stargazing',
    category: 'Binoculars',
    inStock: true,
  },
  {
    id: '3',
    name: 'Star Chart Deluxe',
    price: 49.99,
    description: 'Comprehensive star chart with constellation guide',
    category: 'Books & Charts',
    inStock: true,
  },
  {
    id: '4',
    name: 'Cosmic Camera Mount',
    price: 199.99,
    description: 'Motorized tracking mount for astrophotography',
    category: 'Accessories',
    inStock: false,
  },
  {
    id: '5',
    name: 'Lunar Landing Model Kit',
    price: 79.99,
    description: 'Scale model of the Apollo 11 lunar lander',
    category: 'Models',
    inStock: true,
  },
];

// Type definitions for the products subgraph
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Query {
    products: [Product!]!
    product(id: ID!): Product
    topProducts(limit: Int = 5): [Product!]!
  }

  type Product @key(fields: "id") {
    id: ID!
    name: String!
    price: Float!
    description: String
    category: String
    inStock: Boolean!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    products: withErrorInjection(
      () => {
        return products;
      },
      'products-subgraph',
      PRODUCTS_ERROR_RATE,
      'Failed to fetch products'
    ),
    product: withErrorInjection(
      (_, { id }) => {
        return products.find(product => product.id === id);
      },
      'products-subgraph',
      PRODUCTS_ERROR_RATE,
      'Failed to fetch product'
    ),
    topProducts: withErrorInjection(
      (_, { limit }) => {
        // Return products sorted by popularity (simulated)
        return products.slice(0, limit);
      },
      'products-subgraph',
      PRODUCTS_ERROR_RATE,
      'Failed to fetch top products'
    ),
  },
  Product: {
    __resolveReference: (reference) => {
      return products.find(product => product.id === reference.id);
    },
  },
};

// Create Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

// Start the server
const PORT = process.env.PORT || 4003;

startStandaloneServer(server, {
  listen: { port: PORT },
}).then(({ url }) => {
  console.log(`🚀 Products subgraph ready at ${url}`);
});
