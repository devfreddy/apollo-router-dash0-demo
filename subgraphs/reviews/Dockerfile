FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY reviews/package*.json ./reviews/

# Install dependencies
RUN cd reviews && npm install --omit=dev

# Copy application files
COPY reviews/ ./reviews/

# Copy shared utilities
COPY shared ./shared

# Expose port
EXPOSE 4002

# Start the service
WORKDIR /app/reviews
CMD ["npm", "start"]
