-- ============================================================
-- Clerk native third-party auth alignment
-- - support Clerk session token organization claims
-- - ensure private documents bucket exists
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'org_id',
    current_setting('request.jwt.claims', true)::json->'o'->>'id',
    current_setting('request.headers', true)::json->>'x-org-id',
    ''
  );
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;
