from decimal import Decimal

from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import LabCompletion
from .serializers import LabCompletionSerializer


class LabCompletionViewSet(viewsets.ModelViewSet):
    """CRUD + summary endpoints for lab completions/scores.

    Data is stored in the dedicated ``lab_scores`` database (routed by
    ``LabScoresRouter``). Requires authentication: this previously allowed
    anonymous writes, which meant anyone (logged in or not) could POST a
    fabricated completion record for any username. Both labs authenticate
    their save requests with the trainee's JWT via keepalive fetch (not
    navigator.sendBeacon, which cannot carry an Authorization header), so
    this is safe to enforce without breaking either lab's save-on-submit or
    save-on-close behaviour.
    """

    serializer_class = LabCompletionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = LabCompletion.objects.all()
        username = self.request.query_params.get("username")
        if username:
            queryset = queryset.filter(username=username)
        return queryset

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Aggregated dashboard summary for lab completions.

        Optional ``?username=`` filters to a single user's records.
        """
        queryset = self.get_queryset()
        completions = list(queryset)

        total_score = sum((c.total_score or Decimal("0")) for c in completions)
        count = len(completions)
        average_score = round(float(total_score) / count, 2) if count else 0
        average_time = round(sum(int(c.time_taken or 0) for c in completions) / count, 2) if count else 0
        latest = completions[0] if completions else None

        return Response(
            {
                "completed_count": count,
                "total_score": float(total_score),
                "average_score": average_score,
                "average_time_taken": average_time,
                "latest_completed_at": latest.completed_at if latest else None,
                "latest_standing": latest.standing if latest else None,
                "latest_progress": latest.progress_display if latest else None,
                "completions": LabCompletionSerializer(completions, many=True).data,
            }
        )
