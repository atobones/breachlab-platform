-- Forensic write log for security-sensitive tables.
--
-- Threat model: a privileged operator with shell on the DB container can
-- bypass the application's recordAudit() by hitting Postgres directly via
-- psql. Application code cannot prevent that — but a Postgres-side trigger
-- with SECURITY DEFINER can guarantee that *every* write leaves a row in
-- security_writes_log with the connection's session metadata, regardless
-- of whether the write came from the platform app or a manual psql shell.
--
-- The detection job (`scripts/check-out-of-band-writes.ts`) reads this
-- table and flags rows whose application_name is not the platform's
-- canonical 'breachlab-platform' connection name — which is the exact
-- shape of a manual psql write.

CREATE TABLE "security_writes_log" (
  "id" bigserial PRIMARY KEY,
  "table_name" text NOT NULL,
  "op" text NOT NULL,
  "row_pk" text,
  "row_data" jsonb,
  "session_user" text NOT NULL,
  "application_name" text,
  "client_addr" inet,
  "app_audit_actor" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "security_writes_log_created_at_idx"
  ON "security_writes_log" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX "security_writes_log_app_idx"
  ON "security_writes_log" ("application_name", "created_at" DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "log_security_write"() RETURNS trigger AS $$
DECLARE
  data jsonb;
  pk text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    data := to_jsonb(OLD);
  ELSE
    data := to_jsonb(NEW);
  END IF;
  pk := COALESCE(data->>'id', data->>'user_id', NULL);

  INSERT INTO "security_writes_log" (
    "table_name", "op", "row_pk", "row_data",
    "session_user", "application_name", "client_addr", "app_audit_actor"
  ) VALUES (
    TG_TABLE_NAME, TG_OP, pk, data,
    session_user,
    current_setting('application_name', true),
    inet_client_addr(),
    current_setting('app.audit_actor', true)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
--> statement-breakpoint
CREATE TRIGGER "security_credits_write_log"
AFTER INSERT OR UPDATE OR DELETE ON "security_credits"
FOR EACH ROW EXECUTE FUNCTION "log_security_write"();
--> statement-breakpoint
CREATE TRIGGER "users_security_score_write_log"
AFTER UPDATE OF "security_score", "is_hall_of_fame" ON "users"
FOR EACH ROW
WHEN (OLD."security_score" IS DISTINCT FROM NEW."security_score"
   OR OLD."is_hall_of_fame" IS DISTINCT FROM NEW."is_hall_of_fame")
EXECUTE FUNCTION "log_security_write"();
