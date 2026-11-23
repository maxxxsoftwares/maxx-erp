-- Karigar management. Run after jewellery.sql
create table karigars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  name text not null, mobile text, address text,
  wastage_pct numeric not null default 0, labour_type text not null default 'per_gram' check (labour_type in ('per_gram','fixed')),
  labour_rate numeric not null default 0, unique (tenant_id, name)
);
create table karigar_txns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default my_tenant() references tenants(id) on delete cascade,
  karigar_id uuid not null references karigars(id) on delete cascade,
  txn_date date not null, kind text not null check (kind in ('issue','receive','return','payment')),
  metal text check (metal in ('gold','silver')),
  gross_wt numeric, purity numeric, fine_wt numeric not null default 0,
  wastage_pct numeric not null default 0, wastage_fine numeric not null default 0,
  labour_amount numeric not null default 0, cash_amount numeric not null default 0,
  note text, created_at timestamptz default now()
);
create index on karigar_txns (karigar_id);
alter table tags add column if not exists karigar_txn_id uuid references karigar_txns(id) on delete set null;
do $$ declare x text; begin
  foreach x in array array['karigars','karigar_txns'] loop
    execute format('alter table %I enable row level security', x);
    execute format('create policy "tenant isolation" on %I for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant())', x);
  end loop; end $$;

create function next_tag_no(tid uuid, pre text) returns text language sql as $$
  select pre || lpad((coalesce(max(substring(tag_no from 2)::int),0)+1)::text, 5, '0') from tags where tenant_id = tid and left(tag_no,1) = pre $$;

-- Receive finished goods: creates tags (in stock) and one ledger entry. Karigar's fine balance drops by finished fine + allowed wastage.
create function karigar_receive(p jsonb) returns jsonb language plpgsql as $$
declare tid uuid := my_tenant(); pre text := case p->>'metal' when 'gold' then 'G' else 'S' end;
  it jsonb; txn uuid; tg uuid; net numeric := 0; fine numeric := 0; w numeric; ids jsonb := '[]';
  g numeric; s numeric; pu numeric; wp numeric := coalesce(nullif(p->>'wastage_pct','')::numeric,0);
begin
  perform pg_advisory_xact_lock(hashtext(tid::text || pre));
  for it in select * from jsonb_array_elements(p->'items') loop
    g := (it->>'gross_wt')::numeric; s := coalesce(nullif(it->>'stone_wt','')::numeric,0); pu := coalesce(nullif(it->>'purity','')::numeric,0);
    net := net + (g - s); fine := fine + (g - s) * pu / 100;
  end loop;
  if net <= 0 then raise exception 'Add at least one finished item'; end if;
  w := round(fine * wp / 100, 3);
  insert into karigar_txns(tenant_id,karigar_id,txn_date,kind,metal,gross_wt,purity,fine_wt,wastage_pct,wastage_fine,labour_amount,note)
  values (tid,(p->>'karigar_id')::uuid,(p->>'txn_date')::date,'receive',p->>'metal',round(net,3),round(fine/net*100,3),round(fine,3),wp,w,
    coalesce(nullif(p->>'labour_amount','')::numeric,0),p->>'note') returning id into txn;
  for it in select * from jsonb_array_elements(p->'items') loop
    insert into tags(tenant_id,tag_no,category_id,description,metal,gross_wt,stone_wt,purity,huid,making_type,making_value,stone_value,karigar_txn_id)
    values (tid, next_tag_no(tid,pre), nullif(it->>'category_id','')::uuid, it->>'description', p->>'metal', (it->>'gross_wt')::numeric,
      coalesce(nullif(it->>'stone_wt','')::numeric,0), nullif(it->>'purity','')::numeric, nullif(it->>'huid',''),
      coalesce(it->>'making_type','per_gram'), coalesce(nullif(it->>'making_value','')::numeric,0), coalesce(nullif(it->>'stone_value','')::numeric,0), txn)
    returning id into tg;
    ids := ids || to_jsonb(tg);
  end loop;
  return jsonb_build_object('txn', txn, 'tags', ids);
end $$;
