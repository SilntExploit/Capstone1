from django.urls import path

from .views import LabCompletionViewSet

completion_list = LabCompletionViewSet.as_view({"get": "list", "post": "create"})
completion_detail = LabCompletionViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)
completion_summary = LabCompletionViewSet.as_view({"get": "summary"})

urlpatterns = [
    path("", completion_list, name="lab_completion_list"),
    path("summary/", completion_summary, name="lab_completion_summary"),
    path("<int:pk>/", completion_detail, name="lab_completion_detail"),
]
