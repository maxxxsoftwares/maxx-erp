-- Tally group options (alias, sub-ledger, nett balances, calculation). Run after groups.sql
alter table account_groups add column if not exists alias text;
alter table account_groups add column if not exists subledger boolean not null default false;
alter table account_groups add column if not exists nett_balances boolean not null default false;
alter table account_groups add column if not exists used_for_calc boolean not null default false;
alter table account_groups add column if not exists alloc_method text not null default 'Not Applicable'
  check (alloc_method in ('Not Applicable','Appropriate by Qty','Appropriate by Value'));
