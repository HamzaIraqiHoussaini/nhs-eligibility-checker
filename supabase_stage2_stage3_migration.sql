-- =============================================================================
-- CAS NHS CHAPTER: STAGE 2 & STAGE 3 APPROVAL PIPELINE COMPLETE MIGRATION
-- Run this script in your Supabase Dashboard -> SQL Editor to enable 3-stage approvals.
-- =============================================================================

-- 1. Extend user_role enum to include 'administrator' (if not already done)
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'administrator';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add Administrator review audit columns to project_proposals
ALTER TABLE public.project_proposals
  ADD COLUMN IF NOT EXISTS administrator_decision text,
  ADD COLUMN IF NOT EXISTS administrator_notes text,
  ADD COLUMN IF NOT EXISTS administrator_reviewer_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS administrator_reviewed_at timestamp with time zone;

-- 3. Update project_proposals status check constraint to support 3-stage lifecycle:
-- Stage 1: pending_leadership / rejected_leadership
-- Stage 2: pending_supervisor / rejected_supervisor
-- Stage 3: pending_administrator / rejected_administrator
-- Finalized: approved / completed
ALTER TABLE public.project_proposals DROP CONSTRAINT IF EXISTS project_proposals_status_check;
ALTER TABLE public.project_proposals ADD CONSTRAINT project_proposals_status_check CHECK (
  status IN (
    'pending_leadership', 'rejected_leadership',
    'pending_supervisor', 'rejected_supervisor',
    'pending_administrator', 'rejected_administrator',
    'approved', 'completed'
  )
);

-- 4. Update project_proposals RLS policies to include administrators
DROP POLICY IF EXISTS "Proposals select" ON public.project_proposals;
CREATE POLICY "Proposals select" ON public.project_proposals FOR SELECT USING (
  status IN ('approved', 'completed')
  OR creator_id = auth.uid()
  OR auth.jwt()->>'email' = ANY(co_leader_emails)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leadership', 'supervisor', 'administrator')
  )
);

DROP POLICY IF EXISTS "Proposals update" ON public.project_proposals;
CREATE POLICY "Proposals update" ON public.project_proposals FOR UPDATE USING (
  creator_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leadership', 'supervisor', 'administrator')
  )
);

-- 5. Update project_volunteers delete policy to include administrators
DROP POLICY IF EXISTS "Volunteers delete" ON public.project_volunteers;
CREATE POLICY "Volunteers delete" ON public.project_volunteers FOR DELETE USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('leadership', 'supervisor', 'administrator')
  )
);

-- 6. Update delete_project_proposal function to include administrators
CREATE OR REPLACE FUNCTION public.delete_project_proposal(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller_email text;
  v_caller_id uuid;
  v_role user_role;
  v_prop project_proposals%ROWTYPE;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_caller_id := auth.uid();

  SELECT role INTO v_role FROM profiles WHERE id = v_caller_id;
  SELECT * INTO v_prop FROM project_proposals WHERE id = p_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Proposal not found');
  END IF;

  -- Superadmin can delete anything
  IF v_caller_email = 'hiraqihoussaini@cas.ac.ma' THEN
    DELETE FROM project_volunteers WHERE project_id = p_id;
    DELETE FROM project_proposals WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'message', 'Proposal deleted by superadmin');
  END IF;

  -- Yearly / Annual Projects cannot be deleted by members or standard leadership
  IF v_prop.is_yearly THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yearly projects are assigned by Chapter Leadership and cannot be deleted.');
  END IF;

  -- Approved or completed proposals cannot be deleted
  IF v_prop.status IN ('approved', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Approved proposals cannot be deleted as they are finalized chapter projects.');
  END IF;

  -- Creator, co-leader, leadership, supervisor, or administrator can delete pending/rejected proposals
  IF v_prop.creator_id = v_caller_id 
     OR v_caller_email = ANY (v_prop.co_leader_emails) 
     OR v_role IN ('leadership', 'supervisor', 'administrator') THEN
    DELETE FROM project_volunteers WHERE project_id = p_id;
    DELETE FROM project_proposals WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'message', 'Proposal successfully deleted');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Permission denied: You do not have permission to delete this proposal.');
  END IF;
END;
$function$;

-- 7. Update email_logs select policy to include administrators
DROP POLICY IF EXISTS "Leadership and supervisors can view all email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Leadership, supervisors and administrators can view all email logs" ON public.email_logs;
CREATE POLICY "Leadership, supervisors and administrators can view all email logs"
  ON public.email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('leadership', 'supervisor', 'administrator')
    )
  );
