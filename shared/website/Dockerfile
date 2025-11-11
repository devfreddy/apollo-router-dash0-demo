# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_DASH0_API_TOKEN=""
ARG VITE_ENVIRONMENT="production"
ARG VITE_GRAPHQL_URL="http://localhost:4000/graphql"

# Set environment variables for build
ENV VITE_DASH0_API_TOKEN=$VITE_DASH0_API_TOKEN
ENV VITE_ENVIRONMENT=$VITE_ENVIRONMENT
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the application
RUN npm install -g serve

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
