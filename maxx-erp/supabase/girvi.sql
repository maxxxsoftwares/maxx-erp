-- Girvi & Loan setup. Run after schema.sql
create table loans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  loan_no int not null, customer_name text not null, mobile text, address text,
  loan_date date not null, principal numeric not null check (principal > 0),
  rate_pct numeric not null check (rate_pct >= 0),            -- per month
  interest_type text not null default 'simple' check (interest_type in ('simple','compound')),
  tenure_months int not null default 12,
  status text not null default 'active' check (status in ('active','released','auctioned')),
  released_on date, notes text, created_at timestamptz default now(),
  unique (tenant_id, loan_no)
);
create table loan_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  description text not null, metal text not null default 'gold' check (metal in ('gold','silver','other')),
  gross_wt numeric, net_wt numeric, purity numeric, est_value numeric
);
create table loan_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  pay_date date not null, kind text not null check (kind in ('interest','principal')),
  amount numeric not null check (amount > 0), note text
);
create index on loan_payments (loan_id);
create index on loan_items (loan_id);
do $$ declare x text; begin
  foreach x in array array['loans','loan_items','loan_payments'] loop
    execute format('alter table %I enable row level security', x);
    execute format('create policy "tenant isolation" on %I for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant())', x);
  end loop; end $$;

create function create_loan(p jsonb) returns uuid language plpgsql as $$
declare tid uuid := my_tenant(); n int; lid uuid; it jsonb;
begin
  select coalesce(max(loan_no),0)+1 into n from loans where tenant_id = tid;
  insert into loans(tenant_id,loan_no,customer_name,mobile,address,loan_date,principal,rate_pct,interest_type,tenure_months,notes)
  values (tid,n,p->>'customer_name',p->>'mobile',p->>'address',(p->>'loan_date')::date,(p->>'principal')::numeric,
    (p->>'rate_pct')::numeric,p->>'interest_type',coalesce((p->>'tenure_months')::int,12),p->>'notes') returning id into lid;
  for it in select * from jsonb_array_elements(coalesce(p->'items','[]'::jsonb)) loop
    insert into loan_items(tenant_id,loan_id,description,metal,gross_wt,net_wt,purity,est_value)
    values (tid,lid,it->>'description',coalesce(it->>'metal','gold'),nullif(it->>'gross_wt','')::numeric,nullif(it->>'net_wt','')::numeric,
      nullif(it->>'purity','')::numeric,nullif(it->>'est_value','')::numeric);
  end loop;
  return lid;
end $$;
