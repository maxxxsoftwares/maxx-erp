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

## Live gold/silver rates
Shown under the top bar for Jewellery and Girvi & Loan businesses. The server (app/api/rates) keeps a SignalR connection to MCX_HUB_URL (default: the hub in the desktop client) and the app polls it every 5 seconds. Run `npm install` for the new packages. In Payment/Receipt, choosing Gold or Silver prefills the rate from the live feed.

Run `supabase/groups2.sql` (group options). Accounts Group screens: Account Info > Accounts Group > Create new / Alter / Delete (Tally-style: type to filter the List of Groups, arrows + Enter, Ctrl+A accept, Esc quit, Ctrl+D delete).

## Keyboard shortcuts (Tally ERP 9 style)
Vouchers: F4 Contra, F5 Payment, F6 Receipt, F7 Journal, F8 Sales, F9 Purchase, Ctrl+F8 Credit Note, Ctrl+F9 Debit Note, Alt+F7 Stock Journal, Alt+F8 Sales Order, Alt+F9 Purchase Order, Alt+F5/F6 Rejection In/Out.
Anywhere: Ctrl+A accept/save, Ctrl+Q back, Alt+N calculator (Ctrl+N is reserved by the browser), F2 / Alt+F2 focus the date, Alt+P print, Alt+E export the table to CSV, Alt+F12 filter box.
Gateway (home or Accounts): F1 / F3 select company, Alt+F1 close company, Alt+F3 company details, F11 company details (businesses without loans).
Voucher screen: Alt+C create ledger (new tab), Ctrl+Enter alter ledger (new tab), Ctrl+R repeat previous narration, Page Up / Page Down previous / next voucher.
Day Book: click a voucher, then Alt+2 duplicate, Alt+D delete, Alt+P print voucher, Alt+A / Alt+I add voucher, Alt+F1 or Shift+Enter expand / condense all.
Tag list: Ctrl+Space select / deselect all.

Run `supabase/ledgers2.sql` for the Tally-style Ledger Creation / Alteration / Deletion screens (Account Info > Ledgers > Add Ledger / Alter Ledger / Delete Ledger).

Run `supabase/capital.sql` (after groups.sql and ledgers2.sql): default Capital ledger, double-entry opening balances in 3 columns (amount, gold fine, silver fine), 3-column Trial Balance.

## Sign-in page
Top half shows your firm logo: put your file at `public/logo.png` (falls back to the built-in icon). Super admin signs in at `/superadmin` (not linked on the public page).
Forgot password: run `supabase/otp.sql`, then set WHATSAPP_API_URL, WHATSAPP_INSTANCE_ID, WHATSAPP_TOKEN in `.env.local`. Without them, in development the code is printed in the terminal running `npm run dev`.

## WhatsApp API settings
Run `supabase/whatsapp.sql`. Settings > WhatsApp API (owner or manager): API URL, instance ID, token, country code, on/off and a test message. The token is stored encrypted on the server. Password reset codes use the business's own settings, else the WHATSAPP_* values in `.env.local`.

## WhatsApp + Email
WhatsApp uses your own server (default http://129.225.86.148:3000): Settings > WhatsApp API > Generate Instance / Token (OTP goes to the administrator), Generate QR to link the phone, Update to save. Run `supabase/whatsapp.sql`.
Email goes through Gmail SMTP: Settings > Email settings (sender Gmail + app password). Run `supabase/email.sql`, then `npm install` (adds nodemailer).

## Live rates on Vercel
Vercel cannot keep a connection open, so on Vercel the server connects for a few seconds, saves the latest ticks in `mcx_rates` (run `supabase/mcx.sql`) and the strip refreshes about every 8 seconds. On localhost or your own server it stays connected and is truly live. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY (and MCX_HUB_URL if changed) in the Vercel project settings, then redeploy.
