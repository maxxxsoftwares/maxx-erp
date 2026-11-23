import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { hashOtp } from '../../../../lib/otp';
import { sendWhatsApp, loadWaConfig } from '../../../../lib/whatsapp';
export const runtime = 'nodejs';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || '').trim().toLowerCase(), mobile = String(b.mobile || '').trim();
  if (!/^[a-z0-9]{3,20}$/.test(code) || !/^\d{10}$/.test(mobile)) return NextResponse.json({ error: 'Enter the business code and a 10-digit mobile number' }, { status: 400 });
  const db = admin(), key = `${code}.${mobile}`;

  // at most 3 codes per hour for the same business code + mobile
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db.from('password_resets').select('id', { count: 'exact', head: true }).eq('key', key).gte('created_at', since);
  if ((count || 0) >= 3) return NextResponse.json({ error: 'Too many requests. Please try again in an hour.' }, { status: 429 });

  // find the user (same answer whether or not the account exists)
  let uid = null;
  const { data: ten } = await db.from('tenants').select('id').eq('code', code).maybeSingle();
  if (ten) {
    const { data: ut } = await db.from('user_tenants').select('user_id').eq('tenant_id', ten.id);
    const ids = (ut || []).map(x => x.user_id);
    if (ids.length) { const { data: pr } = await db.from('profiles').select('id').in('id', ids).eq('mobile', mobile).maybeSingle(); uid = pr?.id || null; }
  }
  const otp = String(crypto.randomInt(100000, 1000000));
  await db.from('password_resets').insert({ key, user_id: uid, otp_hash: hashOtp(key, uid ? otp : crypto.randomUUID()), expires_at: new Date(Date.now() + 10 * 60e3).toISOString() });
  if (uid) {
    try { await sendWhatsApp(await loadWaConfig(db, ten.id), mobile, `Maxx ERP: your password reset code is ${otp}. It is valid for 10 minutes. Do not share it with anyone.`); }
    catch { return NextResponse.json({ error: 'Could not send the code on WhatsApp. Please try again later.' }, { status: 502 }); }
  }
  return NextResponse.json({ ok: true });
}
