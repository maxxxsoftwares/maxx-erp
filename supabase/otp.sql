-- Password reset codes sent on WhatsApp. Run once.
create table password_resets (
  id uuid primary key default gen_random_uuid(),
  key text not null,                                   -- business code + mobile
  user_id uuid references auth.users(id) on delete cascade,
  otp_hash text not null,                              -- the code itself is never stored
  expires_at timestamptz not null,
  attempts int not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index on password_resets (key, created_at desc);
alter table password_resets enable row level security;  -- no policies: only the server (service role) can read or write
