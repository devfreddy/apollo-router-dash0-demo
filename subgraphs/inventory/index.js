const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');

// Sample inventory data
const inventory = [
  { productId: '1', quantity: 15, warehouse: 'West Coast', estimatedDelivery: '3-5 days' },
  { productId: '2', quantity: 42, warehouse: 'East Coast', estimatedDelivery: '2-4 days' },
  { productId: '3', quantity: 128, warehouse: 'Midwest', estimatedDelivery: '2-3 days' },
  { productId: '4', quantity: 0, warehouse: 'West Coast', estimatedDelivery: 'Out of stock' },
  { productId: '5', quantity: 23, warehouse: 'East Coast', estimatedDelivery: '3-5 days' },
];

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
    inventory: (product) => {
      const inv = inventory.find(item => item.productId === product.id);
      if (!inv) {
        return {
          quantity: 0,
          warehouse: 'Unknown',
          estimatedDelivery: 'N/A',
        };
      }
      return inv;
    },
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
});
