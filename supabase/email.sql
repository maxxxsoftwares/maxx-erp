-- Email (Gmail SMTP) settings, one row per business. Run once.
create table if not exists email_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  enabled boolean not null default false,
  sender_email text,
  app_password text,                            -- Gmail app password, stored encrypted by the server
  from_name text,
  updated_at timestamptz not null default now()
);
alter table email_settings enable row level security;            -- no policies: only the server (service role) can read or write
