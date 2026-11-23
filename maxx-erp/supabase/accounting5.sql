-- Run after accounting4.sql: Password management and WG column for dual mode entries
-- 1. Add password fields to profiles table
alter table profiles
  add column if not exists password_1 text,
  add column if not exists password_2 text,
  add column if not exists security_password text,
  add column if not exists dual_mode boolean not null default false;

-- 2. Add WG column to voucher_lines to track White/Gray mode entries
alter table voucher_lines
  add column if not exists wg text check (wg in ('', 'G')) default '';

-- 3. Add welcome image to company_profile
alter table company_profile
  add column if not exists welcome_image text;

-- 4. Add unique mobile constraint to ledgers
alter table ledgers
  add column if not exists mobile text unique;
create index if not exists ledgers_mobile_idx on ledgers (mobile);

-- 5. Add customer portal fields to ledgers
alter table ledgers
  add column if not exists customer_password text,
  add column if not exists is_customer boolean not null default false;

-- 6. Create chat_messages table for customer-admin chat
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  ledger_id uuid not null references ledgers(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  is_from_customer boolean not null default false,
  read_at timestamptz,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "tenant isolation" on chat_messages for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant());

-- 7. Create stock_items table for customer portal (Flipkart-style)
create table if not exists stock_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  name text not null,
  description text,
  category text,
  price numeric not null check (price >= 0),
  image_url text,
  stock_qty numeric not null default 0,
  unit text not null default 'pcs',
  is_active boolean not null default true,
  created_at timestamptz default now()
);
alter table stock_items enable row level security;
create policy "tenant isolation" on stock_items for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant());

-- 8. Create orders table for customer portal
create table if not exists customer_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  ledger_id uuid not null references ledgers(id) on delete cascade,
  items jsonb not null default '[]',
  total_amount numeric not null check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  created_at timestamptz default now()
);
alter table customer_orders enable row level security;
create policy "tenant isolation" on customer_orders for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant());

-- 9. Update save_voucher to include WG column
create or replace function save_voucher(p jsonb) returns int language plpgsql as $$
declare vid uuid; n int; td numeric; tc numeric; l jsonb; tid uuid := my_tenant(); f text := fy_of((p->>'vdate')::date);
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  perform pg_advisory_xact_lock(hashtext(tid::text || (p->>'vtype') || f));
  select coalesce(max(vno),0)+1 into n from vouchers where tenant_id = tid and vtype = p->>'vtype' and fy = f;
  insert into vouchers(tenant_id,vtype,vno,vdate,narration,fy) values (tid,p->>'vtype',n,(p->>'vdate')::date,p->>'narration',f) returning id into vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate,wg)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric,coalesce(l->>'wg',''));
  end loop;
  return n;
end $$;

-- 10. Update update_voucher to include WG column
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
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate,wg)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric,coalesce(l->>'wg',''));
  end loop;
end $$;