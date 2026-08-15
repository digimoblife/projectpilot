import logging
import sys
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("projectpilot")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        logger.info(f"[{request_id}] Started {request.method} {request.url.path}")
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            logger.info(
                f"[{request_id}] Completed {request.method} {request.url.path} with status {response.status_code}"
            )
            return response
        except Exception as exc:
            logger.error(
                f"[{request_id}] Failed {request.method} {request.url.path}: {exc}",
                exc_info=True,
            )
            raise exc
