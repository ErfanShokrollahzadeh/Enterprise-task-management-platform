from django.conf import settings
from django.http import HttpResponse


class PreflightCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
        else:
            response = self.get_response(request)

        origin = request.headers.get("Origin")
        if origin and self._origin_allowed(origin):
            response["Access-Control-Allow-Origin"] = origin
            response.setdefault("Vary", "Origin")
            response["Access-Control-Allow-Methods"] = (
                "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            )
            response["Access-Control-Allow-Headers"] = (
                "accept, authorization, content-type, origin, user-agent, "
                "x-csrftoken, x-requested-with"
            )
            response["Access-Control-Allow-Credentials"] = "true"

        return response

    def _origin_allowed(self, origin: str) -> bool:
        if getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False):
            return True
        return origin in getattr(settings, "CORS_ALLOWED_ORIGINS", [])
