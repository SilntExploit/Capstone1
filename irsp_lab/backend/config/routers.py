"""Database routers for the IRSP platform.

The project uses TWO PostgreSQL databases:

* ``default``    -> authentication/login data and all existing apps
                    (authentication, scenarios, scoring, mitre, admin, sessions...).
* ``lab_scores`` -> lab completion/score data owned by the ``lab_scores`` app.

``LabScoresRouter`` makes sure the ``lab_scores`` app only ever reads, writes,
and migrates against the ``lab_scores`` database, while every other app stays on
``default``.
"""


class LabScoresRouter:
    app_label = "lab_scores"
    db_alias = "lab_scores"

    def db_for_read(self, model, **hints):
        if model._meta.app_label == self.app_label:
            return self.db_alias
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == self.app_label:
            return self.db_alias
        return None

    def allow_relation(self, obj1, obj2, **hints):
        labels = {obj1._meta.app_label, obj2._meta.app_label}
        # Allow relations only when both objects live in the same database group.
        if self.app_label in labels:
            return obj1._meta.app_label == obj2._meta.app_label
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # lab_scores models migrate ONLY into the lab_scores database.
        if app_label == self.app_label:
            return db == self.db_alias
        # Nothing else is allowed to migrate into the lab_scores database.
        if db == self.db_alias:
            return False
        return None
