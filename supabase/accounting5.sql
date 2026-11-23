-- Run after all other SQL files: Password management and WG column for dual mode entries
-- 1. Add password fields to profiles table for 3-password system
alter table profiles
  add column if not exists password_1 text,
  add column if not exists password_2 text,
  add column if not exists security_password text,
  add column if not exists dual_mode boolean not null default false;

-- 2. Add WG column to voucher_lines to track White/Gray mode entries
alter table voucher_lines
  add column if not exists wg text check (wg in ('', 'G')) default '';

-- 3. Update save_voucher to include WG column
create or replace function save_voucher(p jsonb) returns int language plpgsql as $$
declare vid uuid; n int; td numeric; tc numeric; l jsonb; tid uuid := my_tenant(); f text := fy_of((p->>'vdate')::date);
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  perform pg_advisory_xact_lock(hashtext(tid::text || (p->>'vtype') || f));
  select coalesce(max(vno),0)+1 into n from vouchers where tenant_id = tid and vtype = p->>'vtype' and fy = f and status = 'posted';
  insert into vouchers(tenant_id,vtype,vno,vdate,narration,fy,status) values (tid,p->>'vtype',n,(p->>'vdate')::date,p->>'narration',f,'posted') returning id into vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate,wg)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric,coalesce(l->>'wg',''));
  end loop;
  return n;
end $$;

-- 4. Update create_voucher_draft to include WG column
create or replace function create_voucher_draft(p jsonb) returns uuid language plpgsql as $$
declare vid uuid; l jsonb; tid uuid := my_tenant(); td numeric; tc numeric;
begin
  select coalesce(sum((x->>'dr')::numeric),0), coalesce(sum((x->>'cr')::numeric),0) into td, tc from jsonb_array_elements(p->'lines') x;
  if td <> tc or td = 0 then raise exception 'Debit and credit must be equal and not zero'; end if;
  insert into vouchers(tenant_id,vtype,vdate,narration,status,created_by) values (tid,p->>'vtype',(p->>'vdate')::date,p->>'narration','draft',auth.uid()) returning id into vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate,wg)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric,coalesce(l->>'wg',''));
  end loop;
  insert into audit_log(tenant_id,actor,actor_name,action,vtype,voucher_id,details) values (tid,auth.uid(),my_name(),'created_draft',p->>'vtype',vid,jsonb_build_object('narration',p->>'narration'));
  return vid;
end $$;

-- 5. Update update_voucher to include WG column
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
    update vouchers set fy = f, vno = (select coalesce(max(vno),0)+1 from vouchers where tenant_id = tid and vtype = vt and fy = f and status = 'posted') where id = vid;
  end if;
  update vouchers set vdate = (p->>'vdate')::date, narration = p->>'narration' where id = vid;
  delete from voucher_lines where voucher_id = vid;
  for l in select * from jsonb_array_elements(p->'lines') loop
    insert into voucher_lines(tenant_id,voucher_id,ledger_id,dr,cr,metal,gross_wt,purity,fine_wt,rate,wg)
    values (tid,vid,(l->>'ledger_id')::uuid,(l->>'dr')::numeric,(l->>'cr')::numeric,l->>'metal',
      (l->>'gross_wt')::numeric,(l->>'purity')::numeric,(l->>'fine_wt')::numeric,(l->>'rate')::numeric,coalesce(l->>'wg',''));
  end loop;
end $$;

-- 6. Add welcome image to company_profile (already in company_welcome.sql but ensuring it's here)
alter table company_profile
  add column if not exists welcome_image_url text;

-- 7. Add unique mobile constraint per tenant (already in mobile_unique.sql but ensuring)
alter table ledgers
  add column if not exists customer_login_enabled boolean not null default true;
create unique index if not exists ledgers_tenant_mobile_unique on ledgers (tenant_id, mobile) where mobile is not null and mobile <> '';

-- 8. Create whatsapp_settings table (if not exists)
create table if not exists whatsapp_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  enabled boolean not null default false,
  api_url text,
  instance_id text,
  token text,          -- encrypted
  country_code text not null default '91',
  updated_at timestamptz default now()
);
alter table whatsapp_settings enable row level security;
create policy "owner manage whatsapp" on whatsapp_settings for all using (tenant_id = my_tenant() and can_post_directly()) with check (tenant_id = my_tenant() and can_post_directly());

-- 9. Create email_settings table (if not exists)
create table if not exists email_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  enabled boolean not null default false,
  sender_email text,
  app_password text,   -- encrypted
  from_name text,
  updated_at timestamptz default now()
);
alter table email_settings enable row level security;
create policy "owner manage email" on email_settings for all using (tenant_id = my_tenant() and can_post_directly()) with check (tenant_id = my_tenant() and can_post_directly());

-- 10. Create otp table for password reset via WhatsApp
create table if not exists otp_codes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  mobile text not null,
  code text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index on otp_codes (tenant_id, mobile);
alter table otp_codes enable row level security;
create policy "tenant isolation" on otp_codes for all using (tenant_id = my_tenant()) with check (tenant_id = my_tenant());

-- 11. Function to send OTP via WhatsApp
create or replace function send_otp_whatsapp(p_tenant_id uuid, p_mobile text) returns text language plpgsql as $$
declare v_code text; v_expires timestamptz;
begin
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  v_expires := now() + interval '10 minutes';
  insert into otp_codes(tenant_id, mobile, code, expires_at) values (p_tenant_id, p_mobile, v_code, v_expires)
    on conflict (tenant_id, mobile) do update set code = v_code, expires_at = v_expires, attempts = 0, used_at = null;
  return v_code;
end $$;