-- MAXX ERP foundation: run in Supabase > SQL Editor
create table tenants (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (code ~ '^[a-z0-9]{3,20}$'),
  name text not null,
  setup_type text not null check (setup_type in ('jewellery','general','girvi_loan','accounts_only')),
  status text not null default 'active' check (status in ('active','suspended','expired')),
  expiry_date date,
  user_limit int not null default 5,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  mobile text,
  role text not null default 'owner' check (role in ('owner','manager','salesman','accountant','karigar')),
  is_super_admin boolean not null default false,
  created_at timestamptz default now()
);

create table tenant_modules (
  tenant_id uuid references tenants(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  primary key (tenant_id, module_key)
);

-- helpers (security definer avoids RLS recursion)
create function public.my_tenant() returns uuid language sql stable security definer set search_path = public
as $$ select tenant_id from profiles where id = auth.uid() $$;
create function public.is_super() returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_super_admin from profiles where id = auth.uid()), false) $$;

alter table tenants enable row level security;
alter table profiles enable row level security;
alter table tenant_modules enable row level security;

create policy "super all tenants" on tenants for all using (is_super()) with check (is_super());
create policy "own tenant read" on tenants for select using (id = my_tenant());
create policy "super all profiles" on profiles for all using (is_super()) with check (is_super());
create policy "own profile read" on profiles for select using (id = auth.uid() or tenant_id = my_tenant());
create policy "super all modules" on tenant_modules for all using (is_super()) with check (is_super());
create policy "own modules read" on tenant_modules for select using (tenant_id = my_tenant());

-- Pattern for EVERY future business table (ledgers, vouchers, items, tags...):
--   tenant_id uuid not null default my_tenant() references tenants(id)
--   alter table X enable row level security;
--   create policy "tenant isolation" on X for all
--     using (tenant_id = my_tenant()) with check (tenant_id = my_tenant());

-- After creating your own account in Supabase Auth, make yourself super admin:
-- insert into profiles (id, name, is_super_admin) values ('<YOUR-AUTH-USER-UUID>', 'Super Admin', true);
