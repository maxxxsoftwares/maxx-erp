-- Run after accounting3.sql
-- 1. Financial year numbering (April to March)
create function fy_of(d date) returns text language sql immutable as $$
  select case when extract(month from d) >= 4
    then extract(year from d)::int::text || '-' || right((extract(year from d)::int + 1)::text, 2)
    else (extract(year from d)::int - 1)::text || '-' || right(extract(year from d)::int::text, 2) end $$;
alter table vouchers add column if not exists fy text;
update vouchers set fy = fy_of(vdate) where fy is null;
alter table vouchers alter column fy set not null;
alter table vouchers drop constraint if exists vouchers_tenant_id_vtype_vno_key;
alter table vouchers add constraint vouchers_unique_per_fy unique (tenant_id, vtype, fy, vno);

create or replace function save_voucher(p jsonb) returns int language plpgsql as $$
declare vid uuid; n int; td numeric; tc numeric; l jsonb; tid uuid := my_tenant(); f text := fy_of((p->>'vdate')::date);
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  perform pg_advisory_xact_lock(hashtext(tid::text || (p->>'vtype') || f));
  select coalesce(max(vno),0)+1 into n from vouchers where tenant_id = tid and vtype = p->>'vtype' and fy = f;
  insert into vouchers(tenant_id,vtype,vno,vdate,narration,fy) values (tid,p->>'vtype',n,(p->>'vdate')::date,p->>'narration',f) returning id into vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric);
  end loop;
  return n;
end $$;

create or replace function update_voucher(p jsonb) returns void language plpgsql as $$
declare td numeric; tc numeric; l jsonb; vid uuid := (p->>'id')::uuid; tid uuid := my_tenant();
        f text := fy_of((p->>'vdate')::date); oldfy text; vt text;
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  select fy, vtype into oldfy, vt from vouchers where id = vid and tenant_id = tid;
  if not found then raise exception 'Voucher not found'; end if;
  if oldfy <> f then
    perform pg_advisory_xact_lock(hashtext(tid::text || vt || f));
    update vouchers set fy = f, vno = (select coalesce(max(vno),0)+1 from vouchers where tenant_id = tid and vtype = vt and fy = f) where id = vid;
  end if;
  update vouchers set vdate = (p->>'vdate')::date, narration = p->>'narration' where id = vid;
  delete from voucher_lines where voucher_id = vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric);
  end loop;
end $$;

-- 2. Closing stock valuation, bank reconciliation, GSTIN, company details
create table stock_valuation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  as_on date not null, amount numeric not null check (amount >= 0), note text, created_at timestamptz default now()
);
create table company_profile (
  tenant_id uuid primary key default my_tenant() references tenants(id) on delete cascade,
  gstin text, pan text, address text, phone text
);
alter table voucher_lines add column if not exists bank_date date;
alter table ledgers add column if not exists gstin text;
do $$ declare x text; begin
  foreach x in array array['stock_valuation','company_profile'] loop
    execute format('alter table %I enable row level security', x);
    execute format('create policy "tenant isolation" on %I for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant())', x);
  end loop; end $$;

-- 3. Several businesses per login
create table user_tenants (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  primary key (user_id, tenant_id)
);
alter table user_tenants enable row level security;
create policy "own memberships" on user_tenants for select using (user_id = auth.uid() or is_super());
create policy "member read tenant" on tenants for select using (id in (select tenant_id from user_tenants where user_id = auth.uid()));
insert into user_tenants select id, tenant_id from profiles where tenant_id is not null on conflict do nothing;
create function switch_tenant(tid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from user_tenants where user_id = auth.uid() and tenant_id = tid) then raise exception 'Not allowed'; end if;
  update profiles set tenant_id = tid where id = auth.uid();
end $$;
