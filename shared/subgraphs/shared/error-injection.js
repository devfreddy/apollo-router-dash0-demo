/**
 * Error injection utility for simulating failures in resolvers
 * Allows percentage-based error injection to test error handling and observability
 */

/**
 * Get the error injection rate from environment variables
 * @param {string} serviceName - The service name (used for env var lookup)
 * @param {number} defaultRate - Default error rate if not configured (0-100)
 * @returns {number} Error rate as a percentage (0-100)
 */
function getErrorRate(serviceName, defaultRate = 0) {
  const envVarName = `${serviceName.toUpperCase().replace(/-/g, '_')}_ERROR_RATE`;
  const rate = process.env[envVarName];

  if (rate !== undefined) {
    const parsed = parseFloat(rate);
    return Math.max(0, Math.min(100, parsed)); // Clamp to 0-100
  }

  return defaultRate;
}

/**
 * Determine if an error should be injected based on error rate
 * @param {number} errorRate - Error rate as a percentage (0-100)
 * @returns {boolean} Whether to inject an error
 */
function shouldInjectError(errorRate) {
  if (errorRate <= 0) return false;
  if (errorRate >= 100) return true;
  return Math.random() * 100 < errorRate;
}

/**
 * Create a GraphQL error for error injection
 * @param {string} message - Error message
 * @param {Object} extensions - GraphQL error extensions
 * @returns {Error} GraphQL-compatible error
 */
function createGraphQLError(message, extensions = {}) {
  const error = new Error(message);
  error.extensions = {
    code: extensions.code || 'INTERNAL_SERVER_ERROR',
    ...extensions,
  };
  return error;
}

/**
 * Wrap a resolver to inject errors based on configured error rate
 * @param {Function} resolver - The resolver function
 * @param {string} serviceName - The service name for error rate lookup
 * @param {number} errorRate - Default error rate if not in env vars
 * @param {string} errorMessage - Custom error message
 * @returns {Function} Wrapped resolver with error injection
 */
function withErrorInjection(resolver, serviceName, errorRate = 0, errorMessage = 'Service error') {
  return async (parent, args, context, info) => {
    const rate = getErrorRate(serviceName, errorRate);

    if (shouldInjectError(rate)) {
      throw createGraphQLError(errorMessage, {
        code: 'SERVICE_ERROR',
        injected: true,
      });
    }

    return resolver(parent, args, context, info);
  };
}

/**
 * Create a middleware that injects errors into all resolver calls
 * @param {string} serviceName - The service name for error rate lookup
 * @param {number} errorRate - Default error rate if not in env vars
 * @returns {Function} Middleware function
 */
function errorInjectionMiddleware(serviceName, errorRate = 0) {
  return {
    didResolveOperation: (context) => {
      const rate = getErrorRate(serviceName, errorRate);

      if (shouldInjectError(rate)) {
        context.errors = context.errors || [];
        context.errors.push(
          createGraphQLError('Service error', {
            code: 'SERVICE_ERROR',
            injected: true,
          })
        );
      }
    },
  };
}

module.exports = {
  getErrorRate,
  shouldInjectError,
  createGraphQLError,
  withErrorInjection,
  errorInjectionMiddleware,
};
