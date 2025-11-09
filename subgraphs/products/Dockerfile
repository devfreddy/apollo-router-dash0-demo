FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY products/package*.json ./products/

# Install dependencies
RUN cd products && npm install --omit=dev

# Copy application files
COPY products/ ./products/

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4003

# Start the service
WORKDIR /app/products
CMD ["npm", "start"]
