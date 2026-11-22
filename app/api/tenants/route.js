import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const MODS = {
  accounts_only: ['accounts','parties','reports'],
  general: ['accounts','parties','stock','sales','reports'],
  girvi_loan: ['parties','loans','pledge','interest','notices','reports'],
  jewellery: ['accounts','parties','stock','tags','sales','karigar','mfg','rates','reports']
};
export async function POST(req) {
  const db = admin();
  // verify caller is a super admin
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await db.from('profiles').select('is_super_admin').eq('id', user.id).single();
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const b = await req.json();
  const code = String(b.code || '').toLowerCase();
  if (!/^[a-z0-9]{3,20}$/.test(code) || !MODS[b.setup_type] || !/^\d{10}$/.test(b.mobile) || (b.password || '').length < 6)
    return NextResponse.json({ error: 'Invalid input (code 3-20 letters/digits, 10-digit mobile, password 6+)' }, { status: 400 });

  const { data: t, error: e1 } = await db.from('tenants').insert({
    code, name: b.name, setup_type: b.setup_type, expiry_date: b.expiry_date || null, user_limit: b.user_limit || 5, gold_trade: !!b.gold_trade || b.setup_type === 'jewellery', silver_trade: !!b.silver_trade || b.setup_type === 'jewellery'
  }).select().single();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const { data: u, error: e2 } = await db.auth.admin.createUser({
    email: `${code}.${b.mobile}@maxxerp.app`, password: b.password, email_confirm: true
  });
  if (e2) { await db.from('tenants').delete().eq('id', t.id); return NextResponse.json({ error: e2.message }, { status: 400 }); }

  await db.from('profiles').insert({ id: u.user.id, tenant_id: t.id, name: b.owner_name, mobile: b.mobile, role: 'owner' });
  await db.from('user_tenants').insert({ user_id: u.user.id, tenant_id: t.id });
  await db.from('tenant_modules').insert(MODS[b.setup_type].map(m => ({ tenant_id: t.id, module_key: m })));
  await db.rpc('seed_accounts', { tid: t.id });
  await db.rpc('seed_gst', { tid: t.id });
  await db.rpc('seed_default_groups', { tid: t.id });
  await db.rpc('seed_capital', { tid: t.id });
  if (b.setup_type === 'jewellery') await db.rpc('seed_jewellery', { tid: t.id });
  return NextResponse.json({ ok: true, id: t.id });
}
export async function PATCH(req) {
  const db = admin();
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token);
  const { data: me } = user ? await db.from('profiles').select('is_super_admin').eq('id', user.id).single() : { data: null };
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id, status } = await req.json();
  const { error } = await db.from('tenants').update({ status }).eq('id', id);
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

// Link an existing login (identified by its first business code + mobile) to another business
export async function PUT(req) {
  const db = admin();
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token);
  const { data: me } = user ? await db.from('profiles').select('is_super_admin').eq('id', user.id).single() : { data: null };
  if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { from_code, mobile, tenant_id } = await req.json();
  const { data: ten } = await db.from('tenants').select('id').eq('code', String(from_code).toLowerCase()).maybeSingle();
  if (!ten) return NextResponse.json({ error: 'Business code not found' }, { status: 404 });
  const { data: ut } = await db.from('user_tenants').select('user_id').eq('tenant_id', ten.id);
  const { data: pr } = await db.from('profiles').select('id').in('id', (ut || []).map(x => x.user_id)).eq('mobile', mobile).maybeSingle();
  if (!pr) return NextResponse.json({ error: 'No user with that mobile in that business' }, { status: 404 });
  const { error } = await db.from('user_tenants').upsert({ user_id: pr.id, tenant_id }, { onConflict: 'user_id,tenant_id', ignoreDuplicates: true });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}
