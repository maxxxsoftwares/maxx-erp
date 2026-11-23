import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export const custEmail = (code, mobile) => `cust.${code.toLowerCase()}.${mobile}@maxxerp.app`;

export async function POST(req) {
  const db = admin();
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || '').trim().toLowerCase(), mobile = String(b.mobile || '').trim(), action = b.action;
  if (!/^[a-z0-9]{3,20}$/.test(code) || !/^\d{10}$/.test(mobile)) return NextResponse.json({ error: 'Enter the business code and a 10-digit mobile number' }, { status: 400 });

  const { data: ten } = await db.from('tenants').select('id, name').eq('code', code).maybeSingle();
  if (!ten) return NextResponse.json({ error: 'Business code not found' }, { status: 404 });
  const { data: ledger } = await db.from('ledgers').select('id, name').eq('tenant_id', ten.id).eq('mobile', mobile).maybeSingle();
  if (!ledger) return NextResponse.json({ error: 'No account was found with that mobile number. Please contact the shop.' }, { status: 404 });

  const email = custEmail(code, mobile);
  const { data: existing } = await db.auth.admin.listUsers({ perPage: 1, page: 1 }); // existence check below via a direct lookup instead
  const { data: already } = await db.from('profiles').select('id').eq('ledger_id', ledger.id).eq('role', 'customer').maybeSingle();

  if (action === 'check') return NextResponse.json({ businessName: ten.name, customerName: ledger.name, hasLogin: !!already });

  if (action === 'create') {
    if (already) return NextResponse.json({ error: 'A login already exists for this account. Please sign in instead.' }, { status: 400 });
    const password = String(b.password || ''); if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    const { data: u, error: e1 } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
    const { error: e2 } = await db.from('profiles').insert({ id: u.user.id, tenant_id: ten.id, name: ledger.name, mobile, role: 'customer', ledger_id: ledger.id });
    if (e2) { await db.auth.admin.deleteUser(u.user.id); return NextResponse.json({ error: e2.message }, { status: 400 }); }
    await db.from('user_tenants').insert({ user_id: u.user.id, tenant_id: ten.id });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
