// Initialize OpenTelemetry BEFORE any other imports
const { initializeOpenTelemetry } = require('./otel');
initializeOpenTelemetry('reviews-subgraph');

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const gql = require('graphql-tag');
const { withErrorInjection } = require('./shared/error-injection');

// Sample reviews data
const reviews = [
  { id: '1', productId: '1', authorId: '1', rating: 5, body: 'Amazing telescope! Crystal clear views of Jupiter and its moons.' },
  { id: '2', productId: '1', authorId: '2', rating: 4, body: 'Great quality but setup instructions could be better.' },
  { id: '3', productId: '2', authorId: '3', rating: 5, body: 'Perfect for beginners. Very easy to use!' },
  { id: '4', productId: '2', authorId: '4', rating: 4, body: 'Good value for the price. Comfortable to hold.' },
  { id: '5', productId: '3', authorId: '5', rating: 5, body: 'Comprehensive and beautifully illustrated.' },
  { id: '6', productId: '3', authorId: '1', rating: 5, body: 'Essential guide for any stargazer!' },
  { id: '7', productId: '4', authorId: '2', rating: 3, body: 'Works well but a bit noisy during tracking.' },
  { id: '8', productId: '5', authorId: '3', rating: 5, body: 'Fun to build and looks great on display.' },
];

// Type definitions for the reviews subgraph
const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type Review @key(fields: "id") {
    id: ID!
    rating: Int!
    body: String!
    product: Product!
    author: User!
  }

  type Product @key(fields: "id", resolvable: false) {
    id: ID!
  }

  type User @key(fields: "id") {
    id: ID!
    reviews: [Review!]!
  }

  extend type Product @key(fields: "id") {
    reviews: [Review!]!
  }
`;

// Resolvers
const resolvers = {
  Review: {
    __resolveReference: (reference) => {
      return reviews.find(review => review.id === reference.id);
    },
    product: withErrorInjection(
      (review) => {
        return { __typename: 'Product', id: review.productId };
      },
      'reviews-subgraph',
      5,
      'Failed to fetch product for review'
    ),
    author: withErrorInjection(
      (review) => {
        return { __typename: 'User', id: review.authorId };
      },
      'reviews-subgraph',
      5,
      'Failed to fetch author for review'
    ),
  },
  User: {
    reviews: withErrorInjection(
      (user) => {
        return reviews.filter(review => review.authorId === user.id);
      },
      'reviews-subgraph',
      5,
      'Failed to fetch user reviews'
    ),
  },
  Product: {
    reviews: withErrorInjection(
      (product) => {
        return reviews.filter(review => review.productId === product.id);
      },
      'reviews-subgraph',
      5,
      'Failed to fetch product reviews'
    ),
  },
};

// Create Apollo Server
const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

// Start the server
const PORT = process.env.PORT || 4002;

startStandaloneServer(server, {
  listen: { port: PORT },
}).then(({ url }) => {
  console.log(`🚀 Reviews subgraph ready at ${url}`);
});
