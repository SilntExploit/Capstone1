from django.urls import path

from .views import (
    AlertQuestionView, AlertsView, ResponseOptionsView, SearchView,
    TimelineView,
)

urlpatterns = [
    path("alerts", AlertsView.as_view(), name="lab_b_alerts"),
    path("alerts/", AlertsView.as_view()),
    path("search", SearchView.as_view(), name="lab_b_search"),
    path("search/", SearchView.as_view()),
    path("lab-b/questions", AlertQuestionView.as_view(), name="lab_b_question"),
    path("lab-b/timeline", TimelineView.as_view(), name="lab_b_timeline"),
    path("lab-b/response-options", ResponseOptionsView.as_view(), name="lab_b_response_options"),
]
