-- =========================================================================
-- FONCTION DE VERROUILLAGE DES JOBS EMAILS (FOR UPDATE SKIP LOCKED)
-- =========================================================================
CREATE OR REPLACE FUNCTION private.lock_next_email_jobs(p_worker_id TEXT, p_limit INT)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  email_type TEXT,
  recipient TEXT,
  attempt_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH next_jobs AS (
    SELECT j.id
    FROM public.email_jobs j
    WHERE j.status IN ('pending', 'failed')
      AND j.attempt_count < j.max_attempts
      AND j.next_attempt_at < now()
    ORDER BY j.next_attempt_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_jobs uj
  SET status = 'processing',
      locked_at = now(),
      locked_by = p_worker_id
  FROM next_jobs
  WHERE uj.id = next_jobs.id
  RETURNING uj.id, uj.order_id, uj.email_type, uj.recipient, uj.attempt_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON FUNCTION private.lock_next_email_jobs FROM PUBLIC;
REVOKE ALL ON FUNCTION private.lock_next_email_jobs FROM anon;
REVOKE ALL ON FUNCTION private.lock_next_email_jobs FROM authenticated;
