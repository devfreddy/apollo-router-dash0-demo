FROM golang:1.21-alpine AS builder

# Install vegeta from source
RUN apk add --no-cache git && \
    go install github.com/tsenart/vegeta@latest

FROM alpine:latest

# Copy vegeta binary from builder
COPY --from=builder /go/bin/vegeta /usr/local/bin/vegeta

# Set working directory
WORKDIR /vegeta

# Default command
ENTRYPOINT ["vegeta"]
CMD ["--help"]
