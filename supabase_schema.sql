-- ==============================================================================
-- CAS NHS CHAPTER PORTAL - COMPLETE DATABASE SCHEMA & SECURITY POLICIES
-- Execute this script in your Supabase Project's SQL Editor:
-- https://supabase.com/dashboard/project/ipnbekxtachtodskthqg/sql/new
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Roles Enum
do $$ begin
  create type user_role as enum ('leadership', 'supervisor', 'member');
exception
  when duplicate_object then null;
end $$;

-- 2. Allowlist Table (Guards who can register)
create table if not exists public.allowlist (
  email text primary key,
  role user_role default 'member'::user_role not null,
  full_name text,
  added_by text default 'system',
  created_at timestamp with time zone default now()
);

-- Pre-seed foundational Super Admin account
insert into public.allowlist (email, role, full_name, added_by)
values ('hiraqihoussaini@cas.ac.ma', 'leadership', 'Hamza Iraqi Houssaini', 'system')
on conflict (email) do update set role = 'leadership';

-- 3. Profiles Table (Linked 1-to-1 with auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text not null,
  grade_level integer default 11,
  role user_role default 'member'::user_role not null,
  is_on_probation boolean default false,
  probation_count integer default 0,
  probation_reason text check (probation_reason in ('grades', 'behavior', 'attendance', 'inactivity', null)),
  probation_notes text,
  probation_updated_at timestamp with time zone,
  is_restricted boolean default false,
  restricted_reason text,
  created_at timestamp with time zone default now()
);

-- 4. Semesters Table (Controls the 2-projects-per-semester limit)
create table if not exists public.semesters (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false,
  created_at timestamp with time zone default now()
);

-- Seed current academic semester
insert into public.semesters (name, start_date, end_date, is_active)
values ('Semester 2 (2024-2025)', current_date - interval '30 days', current_date + interval '120 days', true)
on conflict do nothing;

-- 5. Project Proposals Table (Official CAS Proposal Template + Two-Stage Approval)
create table if not exists public.project_proposals (
  id uuid default gen_random_uuid() primary key,
  semester_id uuid references public.semesters(id) on delete set null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  creator_name text not null,
  creator_email text not null,
  project_title text not null,
  leaders text not null,
  co_leader_emails text[] default '{}',
  advisor_name text not null,
  event_date date not null,
  location text not null,
  awards text,
  background text not null,
  objectives text[] default '{}',
  event_details text[] default '{}',
  costs text[] default '{}',
  needs_from_school text[] default '{}',
  volunteers_needed integer default 0,
  status text default 'pending_leadership' check (
    status in ('pending_leadership', 'rejected_leadership', 'pending_supervisor', 'rejected_supervisor', 'approved', 'completed')
  ),
  leadership_decision text,
  leadership_notes text,
  leadership_reviewer_id uuid references public.profiles(id),
  leadership_reviewed_at timestamp with time zone,
  supervisor_decision text,
  supervisor_notes text,
  supervisor_reviewer_id uuid references public.profiles(id),
  supervisor_reviewed_at timestamp with time zone,
  is_completed boolean default false,
  completed_notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 6. Project Volunteers Table (Tracks who volunteered where)
create table if not exists public.project_volunteers (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.project_proposals(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_name text not null,
  student_email text not null,
  role_description text,
  attended boolean default true,
  created_at timestamp with time zone default now(),
  unique (project_id, user_id)
);

-- 7. Chapter Meetings & Attendance Tables
create table if not exists public.meetings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  meeting_date date not null default current_date,
  agenda text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

create table if not exists public.meeting_attendance (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null check (status in ('present', 'absent', 'excused')),
  notes text,
  created_at timestamp with time zone default now(),
  unique (meeting_id, user_id)
);

-- ==============================================================================
-- AUTOMATED ATTENDANCE -> PROBATION -> DISMISSAL TRIGGER
-- 2 Absences -> Automatic Probation
-- 2 Probations -> Automatic Dismissal & Restricted Account
-- ==============================================================================
create or replace function public.check_attendance_and_probation()
returns trigger as $$
declare
  v_absences integer;
  v_current_probation_count integer;
begin
  -- Count total unexcused absences for the student
  select count(*) into v_absences
  from public.meeting_attendance
  where user_id = NEW.user_id and status = 'absent';

  -- Get current probation count
  select probation_count into v_current_probation_count
  from public.profiles
  where id = NEW.user_id;

  -- 2 Absences rule: Trigger probation if absences reach 2
  if v_absences >= 2 then
    update public.profiles
    set 
      is_on_probation = true,
      probation_count = coalesce(probation_count, 0) + 1,
      probation_reason = 'attendance',
      probation_notes = coalesce(probation_notes, '') || ' [Auto: Reached 2 unexcused meeting absences on ' || current_date || ']',
      probation_updated_at = now()
    where id = NEW.user_id and (is_on_probation = false or probation_reason is null);
  end if;

  -- 2 Probations rule: Trigger Dismissal and Account Restriction
  select probation_count into v_current_probation_count
  from public.profiles
  where id = NEW.user_id;

  if v_current_probation_count >= 2 then
    update public.profiles
    set 
      is_restricted = true,
      is_on_probation = true,
      restricted_reason = 'Dismissed from CAS NHS: Accumulated 2 probations. Account restricted.'
    where id = NEW.user_id;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists tr_check_attendance on public.meeting_attendance;
create trigger tr_check_attendance
after insert or update on public.meeting_attendance
for each row execute function public.check_attendance_and_probation();

-- ==============================================================================
-- AUTOMATED USER CREATION TRIGGER FROM AUTH.USERS
-- Checks allowlist, auto-assigns role, and creates public.profiles row
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role user_role;
  v_name text;
begin
  -- Check allowlist
  select role, full_name into v_role, v_name
  from public.allowlist
  where lower(email) = lower(NEW.email);

  -- Fallback to member role if allowlisted without explicit role, or default
  if v_role is null then
    v_role := 'member'::user_role;
  end if;

  if v_name is null or v_name = '' then
    v_name := coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  end if;

  -- Insert profile
  insert into public.profiles (id, email, full_name, role)
  values (NEW.id, NEW.email, v_name, v_role)
  on conflict (id) do update set
    email = EXCLUDED.email,
    role = coalesce(v_role, profiles.role);

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.semesters enable row level security;
alter table public.project_proposals enable row level security;
alter table public.project_volunteers enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendance enable row level security;

-- Allowlist: readable by anyone (needed for signup verification), editable by leadership
create policy "Allowlist public read" on public.allowlist for select using (true);
create policy "Allowlist leadership manage" on public.allowlist for all using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'leadership'
  )
);

-- Profiles: readable by all authenticated users; editable by owner or leadership
create policy "Profiles read all" on public.profiles for select using (true);
create policy "Profiles update owner or leadership" on public.profiles for update using (
  auth.uid() = id or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'leadership'
  )
);

-- Semesters: readable by all, editable by leadership/supervisor
create policy "Semesters read all" on public.semesters for select using (true);
create policy "Semesters manage leadership" on public.semesters for all using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('leadership', 'supervisor')
  )
);

-- Project Proposals:
-- Members see approved projects and their own proposals; Leadership & Supervisors see all
create policy "Proposals select" on public.project_proposals for select using (
  status in ('approved', 'completed')
  or creator_id = auth.uid()
  or auth.jwt()->>'email' = any(co_leader_emails)
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('leadership', 'supervisor')
  )
);

-- Active members (not restricted) can insert proposals
create policy "Proposals insert active members" on public.project_proposals for insert with check (
  creator_id = auth.uid() and not exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.is_restricted = true
  )
);

-- Creator can update before approval or mark completed; Leadership & Supervisor can update review fields
create policy "Proposals update" on public.project_proposals for update using (
  creator_id = auth.uid()
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('leadership', 'supervisor')
  )
);

-- Volunteers: readable by all, insertable by any active member
create policy "Volunteers read all" on public.project_volunteers for select using (true);
create policy "Volunteers insert" on public.project_volunteers for insert with check (user_id = auth.uid());
create policy "Volunteers delete" on public.project_volunteers for delete using (
  user_id = auth.uid() or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('leadership', 'supervisor')
  )
);

-- Meetings & Attendance: readable by all authenticated; manageable by leadership & supervisor
create policy "Meetings read all" on public.meetings for select using (true);
create policy "Meetings manage" on public.meetings for all using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('leadership', 'supervisor')
  )
);

create policy "Attendance read all" on public.meeting_attendance for select using (true);
create policy "Attendance manage" on public.meeting_attendance for all using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role in ('leadership', 'supervisor')
  )
);

-- ==============================================================================
-- 10. Provision Member Function (Used by AllowlistManager)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.provision_member(p_email text, p_full_name text, p_role text, p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_caller_email text;
  v_caller_role text;
  v_user_id uuid;
  v_clean_email text;
  v_clean_role public.user_role;
  v_existing_role text;
  v_encrypted_pw text;
BEGIN
  v_caller_email := lower(auth.jwt() ->> 'email');

  -- Verify caller is leadership
  SELECT role INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS DISTINCT FROM 'leadership' THEN
    RAISE EXCEPTION 'Forbidden: Only Leadership can provision or reset members.';
  END IF;

  v_clean_email := lower(trim(p_email));
  v_clean_role := p_role::public.user_role;

  -- Security check: Can only reset other leadership if caller is the superadmin
  SELECT role INTO v_existing_role FROM public.profiles WHERE lower(email) = v_clean_email;

  IF (v_existing_role = 'leadership' OR v_clean_role = 'leadership') AND v_clean_email <> v_caller_email THEN
    IF v_caller_email <> 'hiraqihoussaini@cas.ac.ma' AND v_clean_role = 'leadership' AND v_existing_role = 'leadership' THEN
      RAISE EXCEPTION 'Forbidden: Only the Chapter Superadmin (hiraqihoussaini@cas.ac.ma) can reset leadership credentials.';
    END IF;
  END IF;

  -- 1. Insert/update allowlist
  INSERT INTO public.allowlist (email, full_name, role, added_by)
  VALUES (v_clean_email, p_full_name, v_clean_role, v_caller_email)
  ON CONFLICT (email) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;

  -- Hash password using extensions.crypt and extensions.gen_salt
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- 2. Check if user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = v_clean_email;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        raw_user_meta_data = jsonb_build_object('full_name', p_full_name, 'role', p_role, 'email_verified', true),
        confirmation_token = COALESCE(confirmation_token, ''),
        recovery_token = COALESCE(recovery_token, ''),
        email_change_token_new = COALESCE(email_change_token_new, ''),
        email_change = COALESCE(email_change, ''),
        email_change_token_current = COALESCE(email_change_token_current, ''),
        phone_change = COALESCE(phone_change, ''),
        phone_change_token = COALESCE(phone_change_token, ''),
        reauthentication_token = COALESCE(reauthentication_token, ''),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        confirmed_at = COALESCE(confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;

    UPDATE public.profiles
    SET full_name = p_full_name,
        role = v_clean_role
    WHERE id = v_user_id;
  ELSE
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmed_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      email_change_token_current,
      phone_change,
      phone_change_token,
      reauthentication_token,
      raw_app_meta_data,
      raw_user_meta_data,
      role,
      aud,
      is_sso_user,
      is_anonymous,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      v_clean_email,
      v_encrypted_pw,
      now(),
      now(),
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'role', p_role, 'email_verified', true),
      'authenticated',
      'authenticated',
      false,
      false,
      now(),
      now()
    );

    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (v_user_id, v_clean_email, p_full_name, v_clean_role)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
  END IF;

  -- 3. Ensure auth.identities record exists
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_clean_email, 'email_verified', true, 'phone_verified', false),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET identity_data = EXCLUDED.identity_data,
      updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', v_clean_email
  );
END;
$function$;

-- ============================================================================
-- 11. ANNUAL / YEARLY PROJECTS SCHEMA & IMMUTABILITY GUARD
-- ============================================================================

-- Add is_yearly and annual_project_id columns to project_proposals
ALTER TABLE public.project_proposals
ADD COLUMN IF NOT EXISTS is_yearly boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS annual_project_id uuid REFERENCES public.annual_projects(id) ON DELETE SET NULL;

-- Guard Yearly / Annual Projects from being deleted by members
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

  -- Creator, co-leader, leadership, or supervisor can delete pending/rejected proposals
  IF v_prop.creator_id = v_caller_id 
     OR v_caller_email = ANY (v_prop.co_leader_emails) 
     OR v_role IN ('leadership', 'supervisor') THEN
    DELETE FROM project_volunteers WHERE project_id = p_id;
    DELETE FROM project_proposals WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'message', 'Proposal successfully deleted');
  ELSE
    RETURN jsonb_build_object('success', false, 'message', 'Permission denied: You do not have permission to delete this proposal.');
  END IF;
END;
$function$;

