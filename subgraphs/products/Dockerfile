FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY products/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY products/ .

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4003

# Start the service
CMD ["npm", "start"]
