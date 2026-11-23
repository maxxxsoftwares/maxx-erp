import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { hashOtp, sameHash } from '../../../../lib/otp';
export const runtime = 'nodejs';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bad = () => NextResponse.json({ error: 'The code is wrong or has expired' }, { status: 400 });

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const code = String(b.code || '').trim().toLowerCase(), mobile = String(b.mobile || '').trim(), otp = String(b.otp || '').trim(), password = String(b.password || '');
  if (!/^[a-z0-9]{3,20}$/.test(code) || !/^\d{10}$/.test(mobile) || !/^\d{6}$/.test(otp)) return bad();
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  const db = admin(), key = `${code}.${mobile}`;
  const { data: row } = await db.from('password_resets').select('*').eq('key', key).eq('used', false).not('user_id', 'is', null)
    .gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!row || row.attempts >= 5) return bad();
  await db.from('password_resets').update({ attempts: row.attempts + 1 }).eq('id', row.id);
  if (!sameHash(row.otp_hash, hashOtp(key, otp))) return bad();
  const { error } = await db.auth.admin.updateUserById(row.user_id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await db.from('password_resets').update({ used: true }).eq('key', key);
  return NextResponse.json({ ok: true });
}
