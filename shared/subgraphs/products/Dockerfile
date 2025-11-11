FROM python:3.12-slim

WORKDIR /app

# Install dependencies (including curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY main.py .
COPY otel.py .
COPY error_injection.py .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=4003

# Health check using curl with POST
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -X POST http://localhost:4003/graphql \
      -H "Content-Type: application/json" \
      -d '{"query":"{ __typename }"}' \
      --silent --fail -o /dev/null

# Run the application
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4003"]
