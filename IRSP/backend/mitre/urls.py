from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import MitreCoverageView, MitreMappingViewSet

router = DefaultRouter()
router.register(r"mappings", MitreMappingViewSet, basename="mitre_mapping")

urlpatterns = [path("coverage/", MitreCoverageView.as_view(), name="mitre_coverage")]
urlpatterns += router.urls
