-- Ledger Creation screen fields. Run after accounting4.sql
alter table ledgers add column if not exists alias text;
alter table ledgers add column if not exists pan text;
alter table ledgers add column if not exists reg_type text not null default 'Regular' check (reg_type in ('Regular','Composite','Consumer','Unknown'));
alter table ledgers add column if not exists address text;
alter table ledgers add column if not exists street text;
alter table ledgers add column if not exists city text;
alter table ledgers add column if not exists pincode text;
alter table ledgers add column if not exists state text;
alter table ledgers add column if not exists country text default 'India';
alter table ledgers add column if not exists mobile text;
alter table ledgers add column if not exists email text;
alter table ledgers add column if not exists credit_days int check (credit_days is null or credit_days >= 0);
-- Opening balances: cash uses the existing opening / opening_type columns; gold and silver are in grams
alter table ledgers add column if not exists open_gold numeric not null default 0 check (open_gold >= 0);
alter table ledgers add column if not exists open_gold_type text not null default 'Dr' check (open_gold_type in ('Dr','Cr'));
alter table ledgers add column if not exists open_silver numeric not null default 0 check (open_silver >= 0);
alter table ledgers add column if not exists open_silver_type text not null default 'Dr' check (open_silver_type in ('Dr','Cr'));
-- Bank details (as in Tally)
alter table ledgers add column if not exists bank_holder text;
alter table ledgers add column if not exists bank_acno text;
alter table ledgers add column if not exists bank_ifsc text;
