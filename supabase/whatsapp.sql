-- WhatsApp API settings, one row per business. Run once.
create table whatsapp_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  enabled boolean not null default false,
  provider text not null default 'ultramsg' check (provider in ('ultramsg','greenapi')),
  api_url text, instance_id text,
  token text,                                   -- stored encrypted by the server
  country_code text not null default '91',
  updated_at timestamptz not null default now()
);
alter table whatsapp_settings enable row level security;  -- no policies: only the server (service role) can read or write
