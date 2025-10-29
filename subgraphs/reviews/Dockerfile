FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY reviews/package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application files
COPY reviews/ .

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4002

# Start the service
CMD ["npm", "start"]
