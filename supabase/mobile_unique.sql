-- One mobile number per business (lets a customer log in with it). Run once.
-- If this fails with a duplicate-key error, find and fix the clash first, e.g.:
--   select mobile, array_agg(name) from ledgers where tenant_id = '<id>' group by mobile having count(*) > 1;
alter table ledgers add column if not exists customer_login_enabled boolean not null default true;
create unique index if not exists ledgers_tenant_mobile_unique on ledgers (tenant_id, mobile) where mobile is not null and mobile <> '';
