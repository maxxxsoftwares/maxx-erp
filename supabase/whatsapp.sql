-- WhatsApp API settings (your own server), one row per business. Run once.
create table if not exists whatsapp_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  enabled boolean not null default false,
  api_url text, instance_id text,
  token text,                                   -- stored encrypted by the server, never sent to the browser
  country_code text not null default '91',
  updated_at timestamptz not null default now()
);
alter table whatsapp_settings drop column if exists provider;   -- older versions had a provider choice
alter table whatsapp_settings enable row level security;         -- no policies: only the server (service role) can read or write
