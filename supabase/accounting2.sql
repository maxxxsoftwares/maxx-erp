-- Run after accounting.sql: adds Contra, Sales, Purchase voucher types
alter table vouchers drop constraint vouchers_vtype_check;
alter table vouchers add constraint vouchers_vtype_check check (vtype in ('payment','receipt','journal','contra','sales','purchase'));
