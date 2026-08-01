from django.contrib import admin
from django.urls import include, path

from .health import health_check

urlpatterns = [
    path("healthz/", health_check, name="health_check"),
    path("admin/", admin.site.urls),
    path("api/", include("config.api_urls")),
]
