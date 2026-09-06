-- Applied to production as os_communication_execution_v7_5_14.
-- Source-of-truth migration is intentionally kept in repo for reproducible deployment.

create table if not exists public.os_communications (
  id uuid primary key default gen_random_uuid(), assignment_id uuid references public.service_assignments(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(user_id) on delete cascade, channel text not null default 'push',
  message_type text not null default 'service_assignment_confirmation', title text not null, body text not null,
  status text not null default 'draft', idempotency_key text not null unique, sent_at timestamptz, delivered_at timestamptz,
  failure_reason text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
