-- Jewellery setup, part 1: categories + tags. Run after schema.sql
create table item_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  name text not null, unique (tenant_id, name)
);
create table tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  tag_no text not null, category_id uuid references item_categories(id), description text,
  metal text not null check (metal in ('gold','silver','other')),
  gross_wt numeric not null check (gross_wt > 0), stone_wt numeric not null default 0 check (stone_wt >= 0),
  net_wt numeric generated always as (gross_wt - stone_wt) stored,
  purity numeric, huid text,
  making_type text not null default 'per_gram' check (making_type in ('per_gram','fixed','percent')),
  making_value numeric not null default 0, stone_value numeric not null default 0,
  status text not null default 'in_stock' check (status in ('in_stock','sold','with_karigar')),
  store text not null default 'Main', created_at timestamptz default now(),
  unique (tenant_id, tag_no), check (stone_wt <= gross_wt)
);
create index on tags (tenant_id, status);
do $$ declare x text; begin
  foreach x in array array['item_categories','tags'] loop
    execute format('alter table %I enable row level security', x);
    execute format('create policy "tenant isolation" on %I for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant())', x);
  end loop; end $$;

-- Creates qty identical tags (max 100) with numbers G00001 / S00001 / O00001
create function create_tags(p jsonb) returns jsonb language plpgsql as $$
declare tid uuid := my_tenant(); pre text; n int; i int; r record; out jsonb := '[]';
        q int := least(greatest(coalesce((p->>'qty')::int,1),1),100);
begin
  pre := case p->>'metal' when 'gold' then 'G' when 'silver' then 'S' else 'O' end;
  perform pg_advisory_xact_lock(hashtext(tid::text || pre));
  select coalesce(max(substring(tag_no from 2)::int),0) into n from tags where tenant_id = tid and left(tag_no,1) = pre;
  for i in 1..q loop
    n := n + 1;
    insert into tags(tenant_id,tag_no,category_id,description,metal,gross_wt,stone_wt,purity,huid,making_type,making_value,stone_value,store)
    values (tid, pre || lpad(n::text,5,'0'), nullif(p->>'category_id','')::uuid, p->>'description', p->>'metal',
      (p->>'gross_wt')::numeric, coalesce(nullif(p->>'stone_wt','')::numeric,0), nullif(p->>'purity','')::numeric,
      case when q = 1 then nullif(p->>'huid','') end, coalesce(p->>'making_type','per_gram'),
      coalesce(nullif(p->>'making_value','')::numeric,0), coalesce(nullif(p->>'stone_value','')::numeric,0), coalesce(nullif(p->>'store',''),'Main'))
    returning id, tag_no into r;
    out := out || jsonb_build_object('id', r.id, 'tag_no', r.tag_no);
  end loop;
  return out;
end $$;

create function seed_jewellery(tid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into item_categories(tenant_id,name) select tid, x from unnest(array['Ring','Chain','Necklace','Bangle','Earring','Pendant','Bracelet','Coin','Other']) x on conflict do nothing;
end $$;
revoke all on function seed_jewellery(uuid) from public, anon, authenticated;
-- Existing jewellery businesses: select seed_jewellery(id) from tenants where setup_type = 'jewellery';
