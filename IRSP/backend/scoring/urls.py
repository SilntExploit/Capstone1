from rest_framework.routers import DefaultRouter

from .views import ActionViewSet, ScoreViewSet

router = DefaultRouter()
router.register(r"actions", ActionViewSet, basename="action")
router.register(r"scores", ScoreViewSet, basename="score")

urlpatterns = router.urls
