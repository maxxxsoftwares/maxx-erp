-- Double-entry opening balances + default Capital ledger.
-- Run AFTER groups.sql and ledgers2.sql.
-- Signs below: Dr = +, Cr = -.   Units: cash (Rs), gold fine (g), silver fine (g).

alter table ledgers add column if not exists sys_role text check (sys_role in ('capital','cash','gold','silver','pl'));
create unique index if not exists ledgers_one_role on ledgers (tenant_id, sys_role) where sys_role is not null;

-- Add a signed amount to one system ledger's opening (cash / gold / silver)
create function shift_opening(tid uuid, r text, dc numeric, dg numeric, ds numeric) returns void language plpgsql as $$
declare x ledgers%rowtype; nc numeric; ng numeric; ns numeric;
begin
  select * into x from ledgers where tenant_id = tid and sys_role = r for update;
  if not found then raise exception 'System ledger "%" is missing. Run capital.sql again.', r; end if;
  nc := (case when x.opening_type = 'Cr' then -x.opening else x.opening end) + dc;
  ng := (case when x.open_gold_type = 'Cr' then -x.open_gold else x.open_gold end) + dg;
  ns := (case when x.open_silver_type = 'Cr' then -x.open_silver else x.open_silver end) + ds;
  update ledgers set opening = abs(nc), opening_type = case when nc < 0 then 'Cr' else 'Dr' end,
    open_gold = abs(ng), open_gold_type = case when ng < 0 then 'Cr' else 'Dr' end,
    open_silver = abs(ns), open_silver_type = case when ns < 0 then 'Cr' else 'Dr' end where id = x.id;
end $$;

-- Default system ledgers: Capital (under Capital Account), plus roles for Cash / Gold Account / Silver Account / P&L
create function seed_capital(tid uuid) returns void language plpgsql security definer set search_path = public as $$
declare cg uuid;
begin
  select id into cg from account_groups where tenant_id = tid and name = 'Capital Account';
  if cg is null then raise exception 'Capital Account group is missing. Run groups.sql first.'; end if;
  insert into ledgers(tenant_id, name, group_id, sys_role) values (tid, 'Capital', cg, 'capital')
    on conflict (tenant_id, name) do update set group_id = cg, sys_role = 'capital' where ledgers.sys_role is null;
  update ledgers set sys_role = 'cash'   where tenant_id = tid and name = 'Cash' and sys_role is null;
  update ledgers set sys_role = 'gold'   where tenant_id = tid and metal = 'gold' and sys_role is null;
  update ledgers set sys_role = 'silver' where tenant_id = tid and metal = 'silver' and sys_role is null;
  update ledgers set sys_role = 'pl'     where tenant_id = tid and name = 'Profit & Loss A/c' and sys_role is null;
end $$;
revoke all on function seed_capital(uuid) from public, anon, authenticated;

-- System ledgers cannot be renamed, moved or deleted
create function protect_system_ledger() returns trigger language plpgsql as $$
begin
  if old.sys_role is not null then
    if tg_op = 'DELETE' then
      if exists (select 1 from tenants where id = old.tenant_id) then raise exception 'System ledgers cannot be renamed, moved or deleted'; end if;
      return old;
    end if;
    if new.name <> old.name or new.group_id <> old.group_id or new.sys_role is distinct from old.sys_role then
      raise exception 'System ledgers cannot be renamed, moved or deleted';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger trg_protect_system_ledger before update or delete on ledgers for each row execute function protect_system_ledger();

-- Opening balance changed: post the opposite side automatically
--   party / other ledger  -> Capital takes the other side (all 3 columns)
--   Capital itself        -> Cash book, Gold Account and Silver Account take the other side
create function opening_after_save() returns trigger language plpgsql as $$
declare oc numeric := 0; og numeric := 0; os numeric := 0; nc numeric; ng numeric; ns numeric;
begin
  if pg_trigger_depth() > 1 or coalesce(current_setting('app.skip_opening', true), '') = '1' then return null; end if;
  if tg_op = 'UPDATE' then
    oc := case when old.opening_type = 'Cr' then -old.opening else old.opening end;
    og := case when old.open_gold_type = 'Cr' then -old.open_gold else old.open_gold end;
    os := case when old.open_silver_type = 'Cr' then -old.open_silver else old.open_silver end;
  end if;
  nc := case when new.opening_type = 'Cr' then -new.opening else new.opening end;
  ng := case when new.open_gold_type = 'Cr' then -new.open_gold else new.open_gold end;
  ns := case when new.open_silver_type = 'Cr' then -new.open_silver else new.open_silver end;
  if nc = oc and ng = og and ns = os then return null; end if;
  if new.sys_role = 'capital' then
    perform shift_opening(new.tenant_id, 'cash',   -(nc - oc), 0, 0);
    perform shift_opening(new.tenant_id, 'gold',   0, -(ng - og), 0);
    perform shift_opening(new.tenant_id, 'silver', 0, 0, -(ns - os));
  else
    perform shift_opening(new.tenant_id, 'capital', -(nc - oc), -(ng - og), -(ns - os));
  end if;
  return null;
end $$;
create trigger trg_opening_after_save after insert or update of opening, opening_type, open_gold, open_gold_type, open_silver, open_silver_type
  on ledgers for each row execute function opening_after_save();

-- Deleting a ledger removes its opening, so Capital's offset is taken back
create function opening_before_delete() returns trigger language plpgsql as $$
declare oc numeric; og numeric; os numeric;
begin
  if pg_trigger_depth() > 1 or coalesce(current_setting('app.skip_opening', true), '') = '1' then return old; end if;
  if old.sys_role is not null or not exists (select 1 from tenants where id = old.tenant_id) then return old; end if;
  oc := case when old.opening_type = 'Cr' then -old.opening else old.opening end;
  og := case when old.open_gold_type = 'Cr' then -old.open_gold else old.open_gold end;
  os := case when old.open_silver_type = 'Cr' then -old.open_silver else old.open_silver end;
  if oc <> 0 or og <> 0 or os <> 0 then perform shift_opening(old.tenant_id, 'capital', oc, og, os); end if;
  return old;
end $$;
create trigger trg_opening_before_delete before delete on ledgers for each row execute function opening_before_delete();

-- One-off repair for existing data: set Capital so that every column nets to zero
create function rebalance_openings(tid uuid) returns void language plpgsql as $$
declare sc numeric; sg numeric; ss numeric;
begin
  perform set_config('app.skip_opening', '1', true);
  select coalesce(sum(case when opening_type = 'Cr' then -opening else opening end), 0),
         coalesce(sum(case when open_gold_type = 'Cr' then -open_gold else open_gold end), 0),
         coalesce(sum(case when open_silver_type = 'Cr' then -open_silver else open_silver end), 0)
    into sc, sg, ss from ledgers where tenant_id = tid and sys_role is distinct from 'capital';
  update ledgers set opening = abs(sc), opening_type = case when sc > 0 then 'Cr' else 'Dr' end,
    open_gold = abs(sg), open_gold_type = case when sg > 0 then 'Cr' else 'Dr' end,
    open_silver = abs(ss), open_silver_type = case when ss > 0 then 'Cr' else 'Dr' end
  where tenant_id = tid and sys_role = 'capital';
  perform set_config('app.skip_opening', '0', true);
end $$;
revoke all on function rebalance_openings(uuid) from public, anon, authenticated;

-- Trial balance with 3 columns: amount, gold fine, silver fine (opening + movements)
drop function if exists trial_balance(date);
create function trial_balance(upto date default null)
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
  left join (select x.* from voucher_lines x join vouchers v on v.id = x.voucher_id where upto is null or v.vdate <= upto) vl on vl.ledger_id = l.id
  group by l.id, l.name, g.name, l.opening, l.opening_type, l.open_gold, l.open_gold_type, l.open_silver, l.open_silver_type
  order by g.name, l.name
$$;

select seed_capital(id) from tenants;
select rebalance_openings(id) from tenants;
