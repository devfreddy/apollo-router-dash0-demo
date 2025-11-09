FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY inventory/package*.json ./inventory/

# Install dependencies
RUN cd inventory && npm install --omit=dev

# Copy application files
COPY inventory/ ./inventory/

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4004

# Start the service
WORKDIR /app/inventory
CMD ["npm", "start"]
