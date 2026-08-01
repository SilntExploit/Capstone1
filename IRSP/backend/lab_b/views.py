from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import assessment
from .models import LabBAlert, LabBLogEvent
from .querylang import build_search_response
from .serializers import LabBAlertSerializer, LabBLogEventSerializer

DEFAULT_LIMIT = 20
MAX_LIMIT = 100
MAX_QUERY_LENGTH = 500


def _clamp_limit(raw_value):
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return DEFAULT_LIMIT
    return max(1, min(value, MAX_LIMIT))


class AlertsView(APIView):
    """GET /api/alerts?scenario=scenario-b&limit=10

    Response shape matches what js/pages/scenario-b.js expects:
    { count, items: [...] }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        scenario_id = request.query_params.get("scenario")
        limit = _clamp_limit(request.query_params.get("limit"))

        queryset = LabBAlert.objects.all()
        if scenario_id:
            queryset = queryset.filter(scenario_id=scenario_id)

        alerts = LabBAlertSerializer(queryset[:limit], many=True).data
        return Response({"count": len(alerts), "items": alerts})


class SearchView(APIView):
    """GET /api/search?scenario=scenario-b&q=<query>

    Runs the KQL-style query language against Lab B telemetry and returns
    { query, scenario_id, total_matches, severity_breakdown, results }.
    """

    permission_classes = [IsAuthenticated]
    MAX_QUERY_LENGTH = 500

    def get(self, request):
        scenario_id = request.query_params.get("scenario")
        query = request.query_params.get("q", "")[: self.MAX_QUERY_LENGTH]

        queryset = LabBLogEvent.objects.all()
        if scenario_id:
            queryset = queryset.filter(scenario_id=scenario_id)

        records = LabBLogEventSerializer(queryset, many=True).data
        payload = build_search_response(records, query, scenario_id)
        return Response(payload)


class AlertQuestionView(APIView):
    """GET /api/lab-b/questions?alert_key=X -> {question, options} (no answer)
    POST /api/lab-b/questions {alert_key, choice_id} -> {correct: bool}

    The correct choice is never included in the GET response - only this
    server-side check ever compares against it.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        alert_key = request.query_params.get("alert_key", "")
        question = assessment.public_alert_question(alert_key)
        if question is None:
            return Response({"detail": "No question for this alert."}, status=404)
        return Response(question)

    def post(self, request):
        alert_key = str(request.data.get("alert_key", ""))
        choice_id = str(request.data.get("choice_id", ""))
        result = assessment.check_alert_answer(alert_key, choice_id)
        if result is None:
            return Response({"detail": "No question for this alert."}, status=404)
        return Response({"correct": result})


class TimelineView(APIView):
    """GET /api/lab-b/timeline -> [{id, summary}, ...] (shuffled, no order)
    POST /api/lab-b/timeline {ordered_ids: [...]} -> {correct_positions, total}
    """

    permission_classes = [IsAuthenticated]
    MAX_ITEMS = 100

    def get(self, request):
        return Response({"events": assessment.public_timeline_events()})

    def post(self, request):
        ordered_ids = request.data.get("ordered_ids", [])
        if not isinstance(ordered_ids, list):
            return Response({"detail": "ordered_ids must be a list."}, status=400)
        ordered_ids = [str(x) for x in ordered_ids[: self.MAX_ITEMS]]
        correct_positions, total = assessment.check_timeline_order(ordered_ids)
        return Response({"correct_positions": correct_positions, "total": total})


class ResponseOptionsView(APIView):
    """GET /api/lab-b/response-options -> [{id, label}, ...] (no correct flag)
    POST /api/lab-b/response-options {selected_ids: [...]} ->
        {correct_selected, wrong_selected, missed, total_correct}
    """

    permission_classes = [IsAuthenticated]
    MAX_ITEMS = 100

    def get(self, request):
        return Response({"options": assessment.public_response_options()})

    def post(self, request):
        selected_ids = request.data.get("selected_ids", [])
        if not isinstance(selected_ids, list):
            return Response({"detail": "selected_ids must be a list."}, status=400)
        selected_ids = [str(x) for x in selected_ids[: self.MAX_ITEMS]]
        return Response(assessment.check_response_selection(selected_ids))
