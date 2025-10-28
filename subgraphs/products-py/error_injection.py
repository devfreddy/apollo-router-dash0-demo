"""
Error injection utility for Python subgraphs
Allows percentage-based error injection to test error handling and observability
"""

import os
import random
from typing import Callable, Any, Optional


def get_error_rate(service_name: str, default_rate: float = 0.0) -> float:
    """
    Get the error injection rate from environment variables.

    Args:
        service_name: The service name (used for env var lookup)
        default_rate: Default error rate if not configured (0-100)

    Returns:
        Error rate as a percentage (0-100)
    """
    env_var_name = f"{service_name.upper().replace('-', '_')}_ERROR_RATE"
    rate = os.getenv(env_var_name)

    if rate is not None:
        try:
            parsed = float(rate)
            return max(0, min(100, parsed))  # Clamp to 0-100
        except ValueError:
            return default_rate

    return default_rate


def should_inject_error(error_rate: float) -> bool:
    """
    Determine if an error should be injected based on error rate.

    Args:
        error_rate: Error rate as a percentage (0-100)

    Returns:
        Whether to inject an error
    """
    if error_rate <= 0:
        return False
    if error_rate >= 100:
        return True
    return random.random() * 100 < error_rate


class ErrorInjectionException(Exception):
    """Exception for error injection."""

    def __init__(self, message: str, code: str = "SERVICE_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


def with_error_injection(
    resolver: Callable,
    service_name: str,
    error_rate: float = 0.0,
    error_message: str = "Service error"
) -> Callable:
    """
    Decorator to inject errors into a resolver function.

    Args:
        resolver: The resolver function
        service_name: The service name for error rate lookup
        error_rate: Default error rate if not in env vars
        error_message: Custom error message

    Returns:
        Wrapped resolver with error injection
    """
    async def wrapper(*args, **kwargs):
        rate = get_error_rate(service_name, error_rate)

        if should_inject_error(rate):
            raise ErrorInjectionException(
                error_message,
                code="SERVICE_ERROR"
            )

        # Handle both sync and async resolvers
        result = resolver(*args, **kwargs)
        if hasattr(result, "__await__"):
            return await result
        return result

    # For sync resolvers
    def sync_wrapper(*args, **kwargs):
        rate = get_error_rate(service_name, error_rate)

        if should_inject_error(rate):
            raise ErrorInjectionException(
                error_message,
                code="SERVICE_ERROR"
            )

        return resolver(*args, **kwargs)

    # Try to determine if async and return appropriate wrapper
    import inspect
    if inspect.iscoroutinefunction(resolver):
        return wrapper
    else:
        return sync_wrapper
