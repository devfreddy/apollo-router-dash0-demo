// Initialize OpenTelemetry BEFORE any other imports
const { initializeOpenTelemetry } = require('./otel');
initializeOpenTelemetry('inventory-subgraph');

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');
const { withErrorInjection } = require('../shared/error-injection');
const { getInventory, healthCheck } = require('./db/database');

// Get error rate from environment variable
const INVENTORY_ERROR_RATE = parseInt(process.env.INVENTORY_SUBGRAPH_ERROR_RATE || '0', 10);

// Type definitions for the inventory subgraph
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Product @key(fields: "id") {
    id: ID!
    inventory: InventoryInfo
  }

  type InventoryInfo {
    quantity: Int!
    warehouse: String!
    estimatedDelivery: String!
  }
`;

// Resolvers
const resolvers = {
  Product: {
    inventory: withErrorInjection(
      async (product) => {
        try {
          const inv = await getInventory(product.id);
          if (!inv) {
            return {
              quantity: 0,
              warehouse: 'Unknown',
              estimatedDelivery: 'N/A',
            };
          }
          return {
            quantity: inv.quantity,
            warehouse: inv.warehouse,
            estimatedDelivery: inv.estimated_delivery,
          };
        } catch (error) {
          console.error(`Error fetching inventory for product ${product.id}:`, error);
          return {
            quantity: 0,
            warehouse: 'Unknown',
            estimatedDelivery: 'N/A',
          };
        }
      },
      'inventory-subgraph',
      INVENTORY_ERROR_RATE,
      'Failed to fetch inventory'
    ),
  },
};

// Create Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

// Start the server
const PORT = process.env.PORT || 4004;

startStandaloneServer(server, {
  listen: { port: PORT },
}).then(({ url }) => {
  console.log(`🚀 Inventory subgraph ready at ${url}`);

  // Check database connectivity
  healthCheck().then(health => {
    if (health.healthy) {
      console.log('✓ Database connection verified');
    } else {
      console.warn('⚠ Database health check failed:', health.error);
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing gracefully...');
  const { closePool } = require('./db/database');
  await closePool();
  process.exit(0);
});
