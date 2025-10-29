FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY accounts/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY accounts/ .

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4001

# Start the service
CMD ["npm", "start"]
