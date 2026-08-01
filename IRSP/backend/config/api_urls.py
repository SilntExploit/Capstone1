from django.urls import include, path

from mitre.views import MitreMappingViewSet
from scoring.views import ActionViewSet, ScoreViewSet
from scenarios.views import SessionViewSet

session_list = SessionViewSet.as_view({"get": "list", "post": "create"})
session_detail = SessionViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})
action_list = ActionViewSet.as_view({"get": "list", "post": "create"})
action_detail = ActionViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})
score_list = ScoreViewSet.as_view({"get": "list", "post": "create"})
score_detail = ScoreViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})
mitre_technique_list = MitreMappingViewSet.as_view({"get": "list", "post": "create"})
mitre_technique_detail = MitreMappingViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})

urlpatterns = [
    path("auth/", include("authentication.urls")),
    path("scenarios/", include("scenarios.urls")),
    path("scoring/", include("scoring.urls")),
    path("mitre/", include("mitre.urls")),
    path("lab-scores/", include("lab_scores.urls")),
    # Lab B (Endpoint Investigation) telemetry API. Flat paths on purpose:
    # the Lab B frontend calls /api/alerts and /api/search directly.
    path("", include("lab_b.urls")),
    path("sessions/", session_list, name="session_list_alias"),
    path("sessions/<int:pk>/", session_detail, name="session_detail_alias"),
    path("actions/", action_list, name="action_list_alias"),
    path("actions/<int:pk>/", action_detail, name="action_detail_alias"),
    path("scores/", score_list, name="score_list_alias"),
    path("scores/<int:pk>/", score_detail, name="score_detail_alias"),
    path("mitre/techniques/", mitre_technique_list, name="mitre_technique_list_alias"),
    path("mitre/techniques/<int:pk>/", mitre_technique_detail, name="mitre_technique_detail_alias"),
]
