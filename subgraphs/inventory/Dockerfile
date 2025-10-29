FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY inventory/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY inventory/ .

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4004

# Start the service
CMD ["npm", "start"]
