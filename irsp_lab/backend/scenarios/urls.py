from django.urls import path

from .views import (
    ReportsDataView,
    ScenarioViewSet,
    SessionDashboardSummaryView,
    SessionViewSet,
    TeamStatisticsView,
)

scenario_list = ScenarioViewSet.as_view({"get": "list", "post": "create"})
scenario_detail = ScenarioViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})
session_list = SessionViewSet.as_view({"get": "list", "post": "create"})
session_detail = SessionViewSet.as_view({"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"})

urlpatterns = [
    path("", scenario_list, name="scenario_list"),
    path("sessions/", session_list, name="session_list"),
    path("sessions/dashboard-summary/", SessionDashboardSummaryView.as_view(), name="session_dashboard_summary"),
    path("sessions/reports/", ReportsDataView.as_view(), name="reports_data"),
    path("sessions/team-statistics/", TeamStatisticsView.as_view(), name="team_statistics"),
    path("sessions/<int:pk>/", session_detail, name="session_detail"),
    path("<int:pk>/", scenario_detail, name="scenario_detail"),
]
