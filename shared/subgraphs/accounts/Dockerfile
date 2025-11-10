FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY accounts/package*.json ./accounts/

# Install dependencies
RUN cd accounts && npm install --omit=dev

# Copy application files
COPY accounts/ ./accounts/

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4001

# Start the service
WORKDIR /app/accounts
CMD ["npm", "start"]
