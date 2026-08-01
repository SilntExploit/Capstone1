"""KQL-style search query language for Lab B endpoint telemetry.

This is a faithful port of the search DSL originally implemented in the
Node.js prototype (server/domain.js): tokenize -> parse -> evaluate against
each log record. Supports:

    field = "value"          field == "value"        field != "value"
    field has "value"        field contains "value"  field startswith "value"
    field in ("a", "b", "c")
    "bare term"               (matches against a set of searchable fields)
    and / or / not            (with parentheses for grouping)
    severity >= "high"        (severity has a defined rank order)

The trainee-facing search bar and the "attack-stage" chip buttons on the
Lab B page all just send a query string to GET /api/search?q=... and this
module decides which records match.
"""

import re

SEVERITY_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}


def _norm(value):
    return str(value or "").strip().lower()


# --------------------------------------------------------------------------
# Tokenizer
# --------------------------------------------------------------------------

TWO_CHAR_OPS = {">=", "<=", "!=", "=="}
ONE_CHAR_OPS = {"=", ":", ">", "<"}
KEYWORDS = {"and", "or", "not"}
WORD_OPS = {"contains", "has", "startswith", "in"}


def tokenize(query):
    tokens = []
    source = query or ""
    i = 0
    n = len(source)

    while i < n:
        ch = source[i]

        if ch.isspace():
            i += 1
            continue

        if ch in "()":
            tokens.append({"type": ch})
            i += 1
            continue

        if ch == ",":
            tokens.append({"type": ","})
            i += 1
            continue

        if ch in ("\"", "'"):
            quote = ch
            i += 1
            start = i
            value_chars = []
            while i < n and source[i] != quote:
                value_chars.append(source[i])
                i += 1
            if i < n and source[i] == quote:
                i += 1
            tokens.append({"type": "TERM", "value": "".join(value_chars)})
            continue

        two = source[i:i + 2]
        if two in TWO_CHAR_OPS:
            tokens.append({"type": "OP", "value": two})
            i += 2
            continue

        if ch in ONE_CHAR_OPS:
            tokens.append({"type": "OP", "value": ch})
            i += 1
            continue

        value_chars = []
        while i < n:
            c = source[i]
            if c.isspace() or c in "()" or c in "=:><!":
                break
            value_chars.append(c)
            i += 1

        value = "".join(value_chars)
        if value:
            keyword = _norm(value)
            if keyword in KEYWORDS:
                tokens.append({"type": "KEYWORD", "value": keyword.upper()})
            elif keyword in WORD_OPS:
                tokens.append({"type": "OP", "value": keyword})
            else:
                tokens.append({"type": "TERM", "value": value})
            continue

        i += 1

    return tokens


# --------------------------------------------------------------------------
# Parser -> AST (dicts, mirroring the JS shapes)
# --------------------------------------------------------------------------

class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.index = 0

    def peek(self, offset=0):
        idx = self.index + offset
        return self.tokens[idx] if idx < len(self.tokens) else None

    def consume(self):
        token = self.peek()
        self.index += 1
        return token

    def can_start_expression(self, token):
        if not token:
            return False
        if token["type"] == "TERM" or token["type"] == "(":
            return True
        return token["type"] == "KEYWORD" and token["value"] == "NOT"

    def parse_primary(self):
        token = self.peek()
        if not token:
            return None

        if token["type"] == "(":
            self.consume()
            expr = self.parse_or()
            if self.peek() and self.peek()["type"] == ")":
                self.consume()
            return expr

        if token["type"] != "TERM":
            return None

        field_token = self.consume()
        op_token = self.peek()
        value_token = self.peek(1)

        if op_token and op_token["type"] == "OP" and value_token and value_token["type"] == "TERM":
            self.consume()
            value = self.consume()["value"]
            # Allow colon-delimited values like "o365:message_trace" through
            # equality-style filters.
            while (
                op_token["value"] != ":"
                and self.peek()
                and self.peek()["type"] == "OP"
                and self.peek()["value"] == ":"
                and self.peek(1)
                and self.peek(1)["type"] == "TERM"
            ):
                self.consume()
                value += f":{self.consume()['value']}"
            return {"type": "field", "field": field_token["value"], "operator": op_token["value"], "value": value}

        if op_token and op_token["type"] == "OP" and op_token["value"] == "in" and value_token and value_token["type"] == "(":
            self.consume()
            self.consume()
            values = []
            while self.peek() and self.peek()["type"] != ")":
                if self.peek()["type"] == ",":
                    self.consume()
                    continue
                if self.peek()["type"] == "TERM":
                    values.append(self.consume()["value"])
                    continue
                break
            if self.peek() and self.peek()["type"] == ")":
                self.consume()
            return {"type": "field", "field": field_token["value"], "operator": "in", "value": values}

        return {"type": "term", "value": field_token["value"]}

    def parse_unary(self):
        token = self.peek()
        if token and token["type"] == "KEYWORD" and token["value"] == "NOT":
            self.consume()
            return {"type": "not", "value": self.parse_unary()}
        return self.parse_primary()

    def parse_and(self):
        left = self.parse_unary()
        while True:
            token = self.peek()
            if not token or token["type"] == ")" or (token["type"] == "KEYWORD" and token["value"] == "OR"):
                break
            if token["type"] == "KEYWORD" and token["value"] == "AND":
                self.consume()
            elif not self.can_start_expression(token):
                break
            right = self.parse_unary()
            left = {"type": "and", "left": left, "right": right}
        return left

    def parse_or(self):
        left = self.parse_and()
        while True:
            token = self.peek()
            if not token or token["type"] != "KEYWORD" or token["value"] != "OR":
                break
            self.consume()
            right = self.parse_and()
            left = {"type": "or", "left": left, "right": right}
        return left


def parse_query(query):
    return Parser(tokenize(query)).parse_or()


# --------------------------------------------------------------------------
# Evaluation
# --------------------------------------------------------------------------

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)


def _extract(pattern, text, group=1, flags=re.I):
    match = re.search(pattern, text or "", flags)
    return match.group(group) if match else ""


def _record_field_value(record, field):
    field_norm = _norm(field)
    event_text = str(record.get("event") or "")

    sender = _extract(r'sender=([^\s"]+)', event_text) or (
        record.get("user") if "@" in str(record.get("user") or "") else (EMAIL_RE.search(event_text).group(0) if EMAIL_RE.search(event_text) else "")
    )
    recipient = _extract(r'recipient=([^\s"]+)', event_text)

    def domain_of(email):
        email = str(email or "")
        return email.split("@", 1)[1] if "@" in email else ""

    outcome = _extract(r'outcome=([^\s"]+)', event_text)
    if not outcome:
        if re.search(r"failed password", event_text, re.I):
            outcome = "FAILURE"
        elif re.search(r"success", event_text, re.I):
            outcome = "SUCCESS"

    dest_port = _extract(r"dest_port[=:](\d+)", event_text)
    if not dest_port:
        dest_port = _extract(r"\bto\s+(?:\d{1,3}\.){3}\d{1,3}:(\d+)\b", event_text)
    if not dest_port:
        dest_port = _extract(r"\b(?:\d{1,3}\.){3}\d{1,3}:(\d+)\b", event_text)

    derived = {
        "index": "responsegrid",
        "message": event_text,
        "sender": sender,
        "sender_domain": domain_of(sender),
        "recipient": recipient,
        "recipient_domain": domain_of(recipient),
        "subject": _extract(r'subject="([^"]+)"', event_text),
        "attachment": _extract(r'attachment=([^\s"]+)', event_text),
        "outcome": outcome,
        "dest_port": dest_port or str(record.get("dest_port") or ""),
    }

    if field_norm in derived:
        return derived[field_norm]

    return record.get(field_norm, "")


DIRECT_SEARCHABLE_FIELDS = [
    "timestamp", "host", "sourcetype", "user", "severity", "event",
    "technique_id", "src_ip", "dest_ip",
]
DERIVED_SEARCHABLE_FIELDS = [
    "index", "sender", "sender_domain", "recipient", "recipient_domain",
    "subject", "attachment", "outcome", "dest_port",
]


def _searchable_values(record):
    values = [record.get(f) for f in DIRECT_SEARCHABLE_FIELDS]
    values += [_record_field_value(record, f) for f in DERIVED_SEARCHABLE_FIELDS]
    return values


def _glob_to_regex(value):
    escaped = re.escape(str(value)).replace(r"\*", ".*")
    return re.compile(f"^{escaped}$", re.I)


def _compare(field, operator, record_value, expected_value):
    actual = str(record_value or "")
    expected_list = [str(v or "") for v in expected_value] if isinstance(expected_value, list) else None
    expected = "" if isinstance(expected_value, list) else str(expected_value or "")
    field_norm = _norm(field)
    actual_norm = _norm(actual)
    expected_norm = _norm(expected)

    if operator == "!=":
        return not _compare(field, "=", record_value, expected_value)
    if operator == "==":
        return _compare(field, "=", record_value, expected_value)
    if operator == "in":
        return any(_compare(field, "=", record_value, v) for v in (expected_list or []))

    if field_norm == "severity" and operator in (">", ">=", "<", "<=", "="):
        actual_rank = SEVERITY_ORDER.get(actual_norm, 0)
        expected_rank = SEVERITY_ORDER.get(expected_norm, 0)
        if operator == "=":
            return actual_rank == expected_rank
        if operator == ">":
            return actual_rank > expected_rank
        if operator == ">=":
            return actual_rank >= expected_rank
        if operator == "<":
            return actual_rank < expected_rank
        if operator == "<=":
            return actual_rank <= expected_rank

    try:
        actual_number = float(actual)
        expected_number = float(expected)
        numeric = True
    except (TypeError, ValueError):
        numeric = False

    if numeric:
        if operator == "=":
            return actual_number == expected_number
        if operator == ">":
            return actual_number > expected_number
        if operator == ">=":
            return actual_number >= expected_number
        if operator == "<":
            return actual_number < expected_number
        if operator == "<=":
            return actual_number <= expected_number

    if operator in (":", "="):
        if expected == "*":
            return actual.strip() != ""
        if "*" in expected:
            return bool(_glob_to_regex(expected).match(actual))
        if operator == ":":
            return expected_norm in actual_norm
        return actual_norm == expected_norm

    if operator in ("contains", "has"):
        return expected_norm in actual_norm

    if operator == "startswith":
        return actual_norm.startswith(expected_norm)

    return False


def _evaluate(node, record):
    if node is None:
        return True

    node_type = node["type"]
    if node_type == "and":
        return _evaluate(node["left"], record) and _evaluate(node["right"], record)
    if node_type == "or":
        return _evaluate(node["left"], record) or _evaluate(node["right"], record)
    if node_type == "not":
        return not _evaluate(node["value"], record)
    if node_type == "field":
        field_value = _record_field_value(record, node["field"])
        return _compare(node["field"], node["operator"], field_value, node["value"])
    if node_type == "term":
        term = _norm(node["value"])
        if not term:
            return True
        return any(term in _norm(v) for v in _searchable_values(record))

    return True


def search_logs(records, query):
    effective = re.sub(r"^\s*search\s+", "", query or "", flags=re.I)
    effective = re.sub(r"^\s*responsegridlogs\s*\|\s*where\s+", "", effective, flags=re.I)
    effective = re.sub(r"^\s*responsegridlogs\s+", "", effective, flags=re.I)
    effective = re.sub(r"^\s*where\s+", "", effective, flags=re.I)
    effective = re.sub(r"\s*\|[\s\S]*$", "", effective).strip()

    if not _norm(effective):
        return list(records)

    try:
        ast = parse_query(effective)
        return [r for r in records if _evaluate(ast, r)]
    except Exception:
        needle = _norm(effective)
        return [r for r in records if any(needle in _norm(v) for v in _searchable_values(r))]


def build_search_response(records, query, scenario_id):
    matched = search_logs(records, query)

    severity_counts = {}
    for item in matched:
        key = item.get("severity") or "unknown"
        severity_counts[key] = severity_counts.get(key, 0) + 1

    sorted_matched = sorted(matched, key=lambda r: r.get("timestamp") or "", reverse=True)

    return {
        "query": query or "",
        "scenario_id": scenario_id or None,
        "total_matches": len(matched),
        "severity_breakdown": severity_counts,
        "results": sorted_matched[:25],
    }
