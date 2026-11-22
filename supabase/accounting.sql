-- Run AFTER schema.sql
alter table tenants add column if not exists gold_trade boolean not null default false;
alter table tenants add column if not exists silver_trade boolean not null default false;

create table account_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  name text not null, nature text not null check (nature in ('asset','liability','income','expense')),
  unique (tenant_id, name)
);
create table ledgers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  name text not null, group_id uuid not null references account_groups(id),
  opening numeric not null default 0 check (opening >= 0),
  opening_type text not null default 'Dr' check (opening_type in ('Dr','Cr')),
  metal text check (metal in ('gold','silver')),
  unique (tenant_id, name)
);
create table vouchers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  vtype text not null check (vtype in ('payment','receipt','journal')),
  vno int not null, vdate date not null, narration text, created_at timestamptz default now(),
  unique (tenant_id, vtype, vno)
);
create table voucher_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  voucher_id uuid not null references vouchers(id) on delete cascade,
  ledger_id uuid not null references ledgers(id),
  dr numeric not null default 0 check (dr >= 0), cr numeric not null default 0 check (cr >= 0),
  metal text, gross_wt numeric, purity numeric, fine_wt numeric, rate numeric
);
create index on voucher_lines (ledger_id);
create index on vouchers (tenant_id, vdate);

do $$ declare x text; begin
  foreach x in array array['account_groups','ledgers','vouchers','voucher_lines'] loop
    execute format('alter table %I enable row level security', x);
    execute format('create policy "tenant isolation" on %I for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant())', x);
  end loop; end $$;

-- Atomic voucher save; refuses unbalanced entries
create function save_voucher(p jsonb) returns int language plpgsql as $$
declare vid uuid; n int; td numeric; tc numeric; l jsonb; tid uuid := my_tenant();
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  select coalesce(max(vno),0)+1 into n from vouchers where tenant_id = tid and vtype = p->>'vtype';
  insert into vouchers(tenant_id,vtype,vno,vdate,narration) values (tid,p->>'vtype',n,(p->>'vdate')::date,p->>'narration') returning id into vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric);
  end loop;
  return n;
end $$;

create function trial_balance(upto date default null)
returns table(ledger_id uuid, name text, grp text, dr numeric, cr numeric, fine_dr numeric, fine_cr numeric)
language sql stable as $$
  select l.id, l.name, g.name,
    (case when l.opening_type='Dr' then l.opening else 0 end) + coalesce(sum(vl.dr),0),
    (case when l.opening_type='Cr' then l.opening else 0 end) + coalesce(sum(vl.cr),0),
    coalesce(sum(case when vl.dr>0 then vl.fine_wt end),0), coalesce(sum(case when vl.cr>0 then vl.fine_wt end),0)
  from ledgers l join account_groups g on g.id = l.group_id
  left join (select x.* from voucher_lines x join vouchers v on v.id = x.voucher_id where upto is null or v.vdate <= upto) vl on vl.ledger_id = l.id
  group by l.id, l.name, g.name, l.opening, l.opening_type order by g.name, l.name
$$;

-- Default groups + Cash, Gold Account, Silver Account (called by server when a business is created)
create function seed_accounts(tid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into account_groups(tenant_id,name,nature) values
   (tid,'Capital Account','liability'),(tid,'Current Liabilities','liability'),(tid,'Sundry Creditors','liability'),
   (tid,'Current Assets','asset'),(tid,'Cash-in-hand','asset'),(tid,'Bank Accounts','asset'),(tid,'Sundry Debtors','asset'),(tid,'Stock-in-hand','asset'),
   (tid,'Sales Accounts','income'),(tid,'Indirect Income','income'),
   (tid,'Purchase Accounts','expense'),(tid,'Direct Expenses','expense'),(tid,'Indirect Expenses','expense')
  on conflict do nothing;
  insert into ledgers(tenant_id,name,group_id,metal)
  select tid, x.n, (select id from account_groups where tenant_id = tid and name = x.g), x.m
  from (values ('Cash','Cash-in-hand',null),('Gold Account','Stock-in-hand','gold'),('Silver Account','Stock-in-hand','silver'),('Profit & Loss A/c','Capital Account',null)) as x(n,g,m)
  on conflict do nothing;
end $$;
revoke all on function seed_accounts(uuid) from public, anon, authenticated;

-- For businesses you already created before this file:
-- select seed_accounts(id) from tenants;
