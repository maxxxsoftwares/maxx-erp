-- Run after accounting2.sql: voucher editing + GST ledgers
create function update_voucher(p jsonb) returns void language plpgsql as $$
declare td numeric; tc numeric; l jsonb; vid uuid := (p->>'id')::uuid; tid uuid := my_tenant();
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  update vouchers set vdate = (p->>'vdate')::date, narration = p->>'narration' where id = vid and tenant_id = tid;
  if not found then raise exception 'Voucher not found'; end if;
  delete from voucher_lines where voucher_id = vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric);
  end loop;
end $$;

create function seed_gst(tid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into account_groups(tenant_id,name,nature) values
    (tid,'Duties & Taxes','liability'),(tid,'Sales Accounts','income'),(tid,'Purchase Accounts','expense') on conflict do nothing;
  insert into ledgers(tenant_id,name,group_id)
  select tid, x.n, (select id from account_groups where tenant_id = tid and name = x.g)
  from (values ('Sales','Sales Accounts'),('Purchase','Purchase Accounts'),
    ('Output CGST','Duties & Taxes'),('Output SGST','Duties & Taxes'),('Output IGST','Duties & Taxes'),
    ('Input CGST','Duties & Taxes'),('Input SGST','Duties & Taxes'),('Input IGST','Duties & Taxes')) as x(n,g)
  on conflict do nothing;
end $$;
revoke all on function seed_gst(uuid) from public, anon, authenticated;
-- Existing businesses: select seed_gst(id) from tenants;
