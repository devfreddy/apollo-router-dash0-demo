// Initialize OpenTelemetry BEFORE any other imports
const { initializeOpenTelemetry } = require('./otel');
initializeOpenTelemetry('accounts-subgraph');

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');

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
  }

  type User @key(fields: "id") {
    id: ID!
    name: String!
    username: String!
    email: String
  }
`;

// Resolvers
const resolvers = {
  Query: {
    me: () => {
      // Return a random user as "me"
      return users[Math.floor(Math.random() * users.length)];
    },
    user: (_, { id }) => {
      return users.find(user => user.id === id);
    },
    users: () => {
      return users;
    },
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
