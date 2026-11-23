# Maxx ERP: foundation

## Setup (about 10 minutes, all free)
1. Create a free project at supabase.com. Open SQL Editor and run `supabase/schema.sql`.
2. In Supabase > Authentication > Users, add your own user (email + password). Copy its UUID.
3. Run the last commented line of schema.sql with your UUID, to become super admin.
4. Copy `.env.example` to `.env.local` and fill the 3 keys (Project Settings > API).
5. `npm install` then `npm run dev`, open http://localhost:3000
6. Sign in as super admin > create a business > sign out > sign in with business code + mobile + password.

## Deploy free
Push to GitHub, import in vercel.com, add the same 3 env vars. Open the URL on a phone and use
"Add to Home Screen" (iOS) or "Install app" (Android / Chrome PC).

## Tenant safety
Every business table must carry `tenant_id` and the RLS policy shown at the bottom of schema.sql.

## Accounting (run `supabase/accounting.sql` after schema.sql)
For businesses created earlier, also run: `select seed_accounts(id) from tenants;`
Gateway: /books. Keys: F5 Payment, F6 Receipt, F7 Journal, Esc back, Ctrl+Enter save, arrows + Enter in menu.
Gold/silver rows appear only when "Gold trade" / "Silver trade" is ticked for that business.

Run `supabase/accounting2.sql` too (adds Contra F4, Sales F8, Purchase F9). Reports: Ledger account, Profit & Loss, Balance sheet.

Run `supabase/accounting3.sql` (voucher edit + GST ledgers). Existing businesses: `select seed_gst(id) from tenants;`

## Girvi & Loan
Run `supabase/girvi.sql`. Create a business with setup type 'Girvi & Loan'; its Loans tile opens /girvi.
Interest: per month, 30-day months, on principal outstanding between payments; compound adds unpaid interest to the base.

## Jewellery (part 1)
Run `supabase/jewellery.sql`, then `npm install` (adds qrcode + jsbarcode). Existing jewellery businesses: `select seed_jewellery(id) from tenants where setup_type='jewellery';`

## Karigar
Run `supabase/karigar.sql` after jewellery.sql. Jewellery > Karigar: issue metal, receive finished goods (creates tags), return metal, pay cash.

Run `supabase/accounting4.sql`: financial-year voucher numbers, closing stock valuation, bank reconciliation, outstanding ageing, GST report, printable invoices, company details, several businesses per login (/companies).

Run `supabase/groups.sql` after accounting4.sql: adds Tally's 28 default account groups (with parent groups), locked against rename/delete, for new and existing businesses.
