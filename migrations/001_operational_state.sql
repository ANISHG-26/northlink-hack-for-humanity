-- Private schema: never expose this through the Supabase browser/data API.
CREATE SCHEMA IF NOT EXISTS northlink;
REVOKE ALL ON SCHEMA northlink FROM PUBLIC;
CREATE TABLE IF NOT EXISTS northlink.operational_state (
    id smallint PRIMARY KEY CHECK (id = 1),
    payload jsonb NOT NULL CHECK (payload ->> 'version' = '1'),
    updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON northlink.operational_state FROM PUBLIC;
ALTER TABLE northlink.operational_state ENABLE ROW LEVEL SECURITY;
-- The server connects as the owning database role. No public RLS policy.
