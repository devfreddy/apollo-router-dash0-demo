// Initialize OpenTelemetry BEFORE any other imports
const { initializeOpenTelemetry } = require('./otel');
initializeOpenTelemetry('accounts-subgraph');

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');
const { withErrorInjection } = require('./shared/error-injection');

// Sample user data
const users = [
  { id: '1', name: 'Ada Lovelace', username: 'ada', email: 'ada@example.com' },
  { id: '2', name: 'Alan Turing', username: 'alan', email: 'alan@example.com' },
  { id: '3', name: 'Grace Hopper', username: 'grace', email: 'grace@example.com' },
  { id: '4', name: 'Margaret Hamilton', username: 'margaret', email: 'margaret@example.com' },
  { id: '5', name: 'Katherine Johnson', username: 'katherine', email: 'katherine@example.com' },
];

// Type definitions for the accounts subgraph
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Query {
    me: User
    user(id: ID!): User
    users: [User!]!
    recommendedProducts: [Product]
  }

  type User @key(fields: "id") {
    id: ID!
    name: String!
    username: String!
    email: String
  }

  type Product @key(fields: "id") {
    id: ID!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    me: withErrorInjection(
      () => {
        // Return a random user as "me"
        return users[Math.floor(Math.random() * users.length)];
      },
      'accounts-subgraph',
      5,
      'Failed to fetch current user'
    ),
    user: withErrorInjection(
      (_, { id }) => {
        return users.find(user => user.id === id);
      },
      'accounts-subgraph',
      5,
      'Failed to fetch user'
    ),
    users: withErrorInjection(
      () => {
        return users;
      },
      'accounts-subgraph',
      5,
      'Failed to fetch users'
    ),
    recommendedProducts: withErrorInjection(
      () => {
        // Return a simulated list of recommended products
        // This would normally come from a recommendation engine
        const productIds = ['1', '2', '3'];
        return productIds.map(id => ({ id }));
      },
      'accounts-subgraph',
      5,
      'Failed to fetch recommended products'
    ),
  },
  User: {
    __resolveReference: (reference) => {
      return users.find(user => user.id === reference.id);
    },
  },
};

// Create Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

// Start the server
const PORT = process.env.PORT || 4001;

startStandaloneServer(server, {
  listen: { port: PORT },
}).then(({ url }) => {
  console.log(`🚀 Accounts subgraph ready at ${url}`);
});
