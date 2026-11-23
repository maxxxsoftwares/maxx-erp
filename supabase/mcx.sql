-- Latest gold/silver ticks, shared by all businesses. Lets the live strip work on Vercel (serverless). Run once.
create table if not exists mcx_rates (
  symbol text primary key,
  ltp numeric not null default 0, high numeric not null default 0, low numeric not null default 0, close numeric not null default 0,
  updated_at timestamptz, fetched_at timestamptz not null default now()
);
alter table mcx_rates enable row level security;   -- no policies: only the server (service role) can read or write
