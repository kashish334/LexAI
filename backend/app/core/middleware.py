from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time
import logging
import asyncio

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = defaultdict(list)
        self._cleanup_task = None

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host
        now = time.time()
        minute_ago = now - 60

        self.request_counts[client_ip] = [
            t for t in self.request_counts[client_ip] if t > minute_ago
        ]

        if len(self.request_counts[client_ip]) >= self.requests_per_minute:
            return Response(
                content='{"detail": "Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
            )

        self.request_counts[client_ip].append(now)
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"duration={process_time:.3f}s"
        )
        response.headers["X-Process-Time"] = str(process_time)
        return response
