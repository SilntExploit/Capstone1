from rest_framework import permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import IsManagerOrReadOnly
from scoring.models import Action
from scenarios.models import Session

from .models import MitreMapping
from .serializers import MitreMappingSerializer


class MitreMappingViewSet(viewsets.ModelViewSet):
    queryset = MitreMapping.objects.select_related("scenario").all()
    serializer_class = MitreMappingSerializer
    permission_classes = [IsManagerOrReadOnly]


class MitreCoverageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_session_queryset(self, request):
        include_in_progress = request.query_params.get("include_in_progress") == "true"
        statuses = ["completed"]
        if include_in_progress:
            statuses.append("in_progress")
        base = Session.objects.select_related("user", "scenario").filter(status__in=statuses)
        if request.user.role == "manager":
            return base.filter(user__organization=request.user.organization)
        return base.filter(user=request.user)

    def get(self, request):
        sessions = self.get_session_queryset(request)
        session_map = {item.id: item for item in sessions}
        actions = Action.objects.filter(session_id__in=list(session_map.keys())).order_by("occurred_at")
        mappings = {
            f"{item.scenario_id}:{item.technique_id}": item
            for item in MitreMapping.objects.select_related("scenario")
        }
        techniques = {}

        for action in actions:
            if not isinstance(action.payload, dict):
                continue
            technique_id = action.payload.get("mitre_technique_id")
            if not technique_id:
                continue
            session = session_map.get(action.session_id)
            if not session:
                continue
            map_key = f"{session.scenario_id}:{technique_id}"
            mapping = mappings.get(map_key)
            tactic = mapping.tactic if mapping else "Unknown"
            name = mapping.technique_name if mapping else technique_id
            existing = techniques.get(technique_id)
            if not existing or action.occurred_at < existing["discovered_at"]:
                techniques[technique_id] = {
                    "technique_id": technique_id,
                    "technique_name": name,
                    "tactic": tactic,
                    "discovered_at": action.occurred_at,
                }

        ordered = sorted(techniques.values(), key=lambda item: item["discovered_at"], reverse=True)
        return Response(
            {
                "include_in_progress": request.query_params.get("include_in_progress") == "true",
                "count": len(ordered),
                "techniques": ordered,
            }
        )
