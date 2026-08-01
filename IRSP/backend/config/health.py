from django.db import connection
from django.http import JsonResponse


def health_check(request):
    """Container health endpoint used by Docker Compose.

    Returns 200 only when Django is running and the database connection works.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:
        return JsonResponse({"status": "unhealthy", "database": "unavailable", "error": str(exc)}, status=503)

    return JsonResponse({"status": "healthy", "database": "available"})
