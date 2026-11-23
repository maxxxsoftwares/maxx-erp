-- Tally's 28 default account groups. Run after accounting4.sql
alter table account_groups add column if not exists parent_id uuid references account_groups(id);
alter table account_groups add column if not exists is_default boolean not null default false;

-- Default groups cannot be renamed or deleted (your own groups can)
create function protect_default_group() returns trigger language plpgsql as $$
begin
  if old.is_default and (tg_op = 'DELETE' or new.name <> old.name) then
    if tg_op = 'DELETE' and not exists (select 1 from tenants where id = old.tenant_id) then return old; end if;
    raise exception 'Default groups cannot be renamed or deleted';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger trg_protect_default_group before update or delete on account_groups for each row execute function protect_default_group();

create function seed_default_groups(tid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update account_groups set name = 'Indirect Incomes' where tenant_id = tid and name = 'Indirect Income'
    and not exists (select 1 from account_groups x where x.tenant_id = tid and x.name = 'Indirect Incomes');
  -- 15 primary groups
  insert into account_groups(tenant_id,name,nature,is_default) values
    (tid,'Branch / Divisions','liability',true),(tid,'Capital Account','liability',true),(tid,'Current Assets','asset',true),
    (tid,'Current Liabilities','liability',true),(tid,'Direct Expenses','expense',true),(tid,'Direct Incomes','income',true),
    (tid,'Fixed Assets','asset',true),(tid,'Indirect Expenses','expense',true),(tid,'Indirect Incomes','income',true),
    (tid,'Investments','asset',true),(tid,'Loans (Liability)','liability',true),(tid,'Misc. Expenses (ASSET)','asset',true),
    (tid,'Purchase Accounts','expense',true),(tid,'Sales Accounts','income',true),(tid,'Suspense A/c','liability',true)
  on conflict (tenant_id, name) do update set is_default = true;
  -- 13 sub-groups
  insert into account_groups(tenant_id,name,nature,is_default,parent_id)
  select tid, s.n, s.nat, true, (select g.id from account_groups g where g.tenant_id = tid and g.name = s.p)
  from (values
    ('Bank Accounts','Current Assets','asset'),('Bank OD A/c','Loans (Liability)','liability'),('Cash-in-hand','Current Assets','asset'),
    ('Deposits (Asset)','Current Assets','asset'),('Duties & Taxes','Current Liabilities','liability'),('Loans & Advances (Asset)','Current Assets','asset'),
    ('Provisions','Current Liabilities','liability'),('Reserves & Surplus','Capital Account','liability'),('Secured Loans','Loans (Liability)','liability'),
    ('Stock-in-hand','Current Assets','asset'),('Sundry Creditors','Current Liabilities','liability'),('Sundry Debtors','Current Assets','asset'),
    ('Unsecured Loans','Loans (Liability)','liability')) as s(n,p,nat)
  on conflict (tenant_id, name) do update set parent_id = excluded.parent_id, is_default = true;
end $$;
revoke all on function seed_default_groups(uuid) from public, anon, authenticated;

select seed_default_groups(id) from tenants;   -- existing businesses
