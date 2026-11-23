-- Customer self-service: see their own ledger & bills, browse stock, place orders, chat with the owner.
-- Run after mobile_unique.sql and jewellery.sql (for the tags table) and drafts_audit.sql (for can_post_directly).

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('owner','manager','salesman','accountant','karigar','operator','customer'));
alter table profiles add column if not exists ledger_id uuid references ledgers(id);
alter table tags add column if not exists image_url text;

create or replace function is_customer() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'customer' from profiles where id = auth.uid()), false) $$;
create or replace function my_ledger_id() returns uuid language sql stable security definer set search_path = public as $$
  select ledger_id from profiles where id = auth.uid() $$;

-- A customer may look at stock, but never add/change/remove it
drop policy if exists "tenant isolation" on tags;
create policy "tags select" on tags for select using (tenant_id = my_tenant());
create policy "tags write" on tags for insert with check (tenant_id = my_tenant() and not is_customer());
create policy "tags update" on tags for update using (tenant_id = my_tenant() and not is_customer()) with check (tenant_id = my_tenant() and not is_customer());
create policy "tags delete" on tags for delete using (tenant_id = my_tenant() and not is_customer());

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  customer_id uuid not null references auth.users(id),
  ledger_id uuid references ledgers(id),
  status text not null default 'placed' check (status in ('placed','confirmed','cancelled','fulfilled')),
  note text, created_at timestamptz not null default now()
);
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  tag_id uuid references tags(id), description text, qty int not null default 1
);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  customer_id uuid not null references auth.users(id),            -- which customer's thread this belongs to
  sender uuid not null references auth.users(id), sender_role text not null check (sender_role in ('customer','staff')),
  body text not null, created_at timestamptz not null default now()
);
do $$ declare x text; begin
  foreach x in array array['orders','order_items','messages'] loop
    execute format('alter table %I enable row level security', x);
  end loop; end $$;
create policy "staff all orders" on orders for all using (tenant_id = my_tenant() and not is_customer()) with check (tenant_id = my_tenant() and not is_customer());
create policy "own orders" on orders for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "staff all order_items" on order_items for all using (tenant_id = my_tenant() and not is_customer()) with check (tenant_id = my_tenant());
create policy "own order_items" on order_items for all using (order_id in (select id from orders where customer_id = auth.uid()));
create policy "staff all messages" on messages for all using (tenant_id = my_tenant() and not is_customer()) with check (tenant_id = my_tenant());
create policy "own messages" on messages for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- A customer sees only their own ledger's statement, never anyone else's
create function my_ledger_statement()
returns table(vdate date, vtype text, vno int, narration text, dr numeric, cr numeric, wg text)
language sql stable security definer set search_path = public as $$
  select v.vdate, v.vtype, v.vno, v.narration, vl.dr, vl.cr, vl.wg
  from voucher_lines vl join vouchers v on v.id = vl.voucher_id
  where vl.ledger_id = my_ledger_id() and v.status = 'posted'
  order by v.vdate, v.vno
$$;

create function place_order(items jsonb, note text default null) returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid; it jsonb;
begin
  if is_customer() is not true then raise exception 'Only a customer account can place an order'; end if;
  insert into orders(tenant_id,customer_id,ledger_id,note) values (my_tenant(),auth.uid(),my_ledger_id(),note) returning id into oid;
  for it in select * from jsonb_array_elements(coalesce(items,'[]'::jsonb)) loop
    insert into order_items(tenant_id,order_id,tag_id,description,qty) values (my_tenant(),oid,nullif(it->>'tag_id','')::uuid,it->>'description',coalesce((it->>'qty')::int,1));
  end loop;
  return oid;
end $$;

create function send_message(body text) returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid; cid uuid;
begin
  cid := case when is_customer() then auth.uid() else null end;      -- staff must say whose thread via send_staff_message
  if cid is null then raise exception 'Use send_staff_message to reply as staff'; end if;
  insert into messages(tenant_id,customer_id,sender,sender_role,body) values (my_tenant(),cid,auth.uid(),'customer',body) returning id into mid;
  return mid;
end $$;

create function send_staff_message(to_customer uuid, body text) returns uuid language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if is_customer() then raise exception 'Customers use send_message'; end if;
  insert into messages(tenant_id,customer_id,sender,sender_role,body) values (my_tenant(),to_customer,auth.uid(),'staff',body) returning id into mid;
  return mid;
end $$;
