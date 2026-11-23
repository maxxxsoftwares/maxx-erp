-- Draft vouchers + owner approval + a visible, permanent audit trail.
-- This is the transparent alternative: nothing is hidden from the books and nothing
-- that was ever posted can be removed without leaving a record of who removed it and why.
-- Run after capital.sql.

alter table vouchers add column if not exists status text not null default 'posted' check (status in ('draft','posted','rejected'));
alter table vouchers add column if not exists created_by uuid references auth.users(id);
alter table vouchers alter column vno drop not null;
alter table vouchers alter column fy drop not null;
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('owner','manager','salesman','accountant','karigar','operator'));

create or replace function can_post_directly() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner','manager') from profiles where id = auth.uid()), false) $$;
create or replace function my_name() returns text language sql stable security definer set search_path = public as $$
  select name from profiles where id = auth.uid() $$;

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  actor uuid references auth.users(id), actor_name text,
  action text not null,                          -- created_draft | approved | rejected | deleted | self_deleted
  vtype text, vno int, fy text, voucher_id uuid,
  details jsonb, at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "owner read audit" on audit_log for select using (tenant_id = my_tenant() and can_post_directly());
create policy "tenant insert audit" on audit_log for insert with check (tenant_id = my_tenant());

-- Create a voucher as a draft: no voucher number yet, excluded from every report until approved
create function create_voucher_draft(p jsonb) returns uuid language plpgsql as $$
declare vid uuid; l jsonb; tid uuid := my_tenant(); td numeric; tc numeric;
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  insert into vouchers(tenant_id,vtype,vdate,narration,status,created_by) values (tid,p->>'vtype',(p->>'vdate')::date,p->>'narration','draft',auth.uid()) returning id into vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',(l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric);
  end loop;
  insert into audit_log(tenant_id,actor,actor_name,action,vtype,voucher_id,details) values (tid,auth.uid(),my_name(),'created_draft',p->>'vtype',vid,jsonb_build_object('narration',p->>'narration'));
  return vid;
end $$;

-- Owner/manager only: give it a real voucher number and post it for real
create function approve_voucher(id uuid) returns int language plpgsql as $$
declare tid uuid := my_tenant(); v vouchers%rowtype; f text; n int;
begin
  if not can_post_directly() then raise exception 'Only an owner or manager can approve a voucher'; end if;
  select * into v from vouchers where vouchers.id = approve_voucher.id and tenant_id = tid and status = 'draft';
  if not found then raise exception 'Draft voucher not found'; end if;
  f := fy_of(v.vdate);
  perform pg_advisory_xact_lock(hashtext(tid::text || v.vtype || f));
  select coalesce(max(vno),0)+1 into n from vouchers where tenant_id = tid and vtype = v.vtype and fy = f and status = 'posted';
  update vouchers set status = 'posted', vno = n, fy = f where vouchers.id = v.id;
  insert into audit_log(tenant_id,actor,actor_name,action,vtype,vno,fy,voucher_id) values (tid,auth.uid(),my_name(),'approved',v.vtype,n,f,v.id);
  return n;
end $$;

create function reject_voucher(id uuid, reason text default null) returns void language plpgsql as $$
declare tid uuid := my_tenant(); v vouchers%rowtype;
begin
  if not can_post_directly() then raise exception 'Only an owner or manager can reject a voucher'; end if;
  select * into v from vouchers where vouchers.id = reject_voucher.id and tenant_id = tid and status = 'draft';
  if not found then raise exception 'Draft voucher not found'; end if;
  insert into audit_log(tenant_id,actor,actor_name,action,vtype,voucher_id,details) values (tid,auth.uid(),my_name(),'rejected',v.vtype,v.id,jsonb_build_object('reason',reason));
  update vouchers set status = 'rejected' where vouchers.id = v.id;
end $$;

-- The person who created a draft/rejected voucher can remove it themselves (no audit needed: it was never posted)
create function delete_own_draft(id uuid) returns void language plpgsql as $$
declare tid uuid := my_tenant();
begin
  delete from vouchers where vouchers.id = delete_own_draft.id and tenant_id = tid and status in ('draft','rejected') and created_by = auth.uid();
  if not found then raise exception 'Not found, or it is not your own draft'; end if;
end $$;

-- Deleting a POSTED voucher: owner/manager only, and it is logged, with its lines, before it goes
create function delete_voucher_logged(id uuid) returns void language plpgsql as $$
declare tid uuid := my_tenant(); v vouchers%rowtype; ls jsonb;
begin
  if not can_post_directly() then raise exception 'Only an owner or manager can delete a posted voucher'; end if;
  select * into v from vouchers where vouchers.id = delete_voucher_logged.id and tenant_id = tid;
  if not found then raise exception 'Voucher not found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('ledger_id',ledger_id,'dr',dr,'cr',cr)),'[]') into ls from voucher_lines where voucher_id = v.id;
  insert into audit_log(tenant_id,actor,actor_name,action,vtype,vno,fy,voucher_id,details) values (tid,auth.uid(),my_name(),'deleted',v.vtype,v.vno,v.fy,v.id,jsonb_build_object('narration',v.narration,'vdate',v.vdate,'lines',ls));
  delete from vouchers where vouchers.id = v.id;
end $$;

-- Every report must read only posted vouchers
create or replace function trial_balance(upto date default null)
returns table(ledger_id uuid, name text, grp text, dr numeric, cr numeric, g_dr numeric, g_cr numeric, s_dr numeric, s_cr numeric)
language sql stable as $$
  select l.id, l.name, g.name,
    (case when l.opening_type = 'Dr' then l.opening else 0 end) + coalesce(sum(vl.dr), 0),
    (case when l.opening_type = 'Cr' then l.opening else 0 end) + coalesce(sum(vl.cr), 0),
    (case when l.open_gold_type = 'Dr' then l.open_gold else 0 end) + coalesce(sum(case when vl.metal = 'gold' and vl.dr > 0 then vl.fine_wt end), 0),
    (case when l.open_gold_type = 'Cr' then l.open_gold else 0 end) + coalesce(sum(case when vl.metal = 'gold' and vl.cr > 0 then vl.fine_wt end), 0),
    (case when l.open_silver_type = 'Dr' then l.open_silver else 0 end) + coalesce(sum(case when vl.metal = 'silver' and vl.dr > 0 then vl.fine_wt end), 0),
    (case when l.open_silver_type = 'Cr' then l.open_silver else 0 end) + coalesce(sum(case when vl.metal = 'silver' and vl.cr > 0 then vl.fine_wt end), 0)
  from ledgers l join account_groups g on g.id = l.group_id
  left join (select x.* from voucher_lines x join vouchers v on v.id = x.voucher_id where v.status = 'posted' and (upto is null or v.vdate <= upto)) vl on vl.ledger_id = l.id
  group by l.id, l.name, g.name, l.opening, l.opening_type, l.open_gold, l.open_gold_type, l.open_silver, l.open_silver_type
  order by g.name, l.name
$$;
