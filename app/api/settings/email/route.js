import { NextResponse } from 'next/server';
import { who, deny } from '../../../../lib/settingsAuth';
import { encrypt, decrypt } from '../../../../lib/whatsapp';
import { rowToEmailCfg, sendEmail } from '../../../../lib/email';
export const runtime = 'nodejs';
const bad = (m, s = 400) => NextResponse.json({ error: m }, { status: s });
const isMail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function GET(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const { data: r } = await w.db.from('email_settings').select('*').eq('tenant_id', w.tenant).maybeSingle();
  const pw = r?.app_password ? decrypt(r.app_password) : '';
  return NextResponse.json({ settings: r ? { enabled: r.enabled, sender_email: r.sender_email || '', from_name: r.from_name || '' } : null, passHint: pw ? pw.slice(-2) : '' });
}
export async function PUT(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const b = await req.json().catch(() => ({})), sender = String(b.sender_email || '').trim();
  if (sender && !isMail(sender)) return bad('Enter a valid sender email address');
  const { data: old } = await w.db.from('email_settings').select('app_password').eq('tenant_id', w.tenant).maybeSingle();
  const pass = String(b.app_password || '').replace(/\s/g, '') ? encrypt(String(b.app_password).replace(/\s/g, '')) : old?.app_password || null;
  if (b.enabled && !(sender && pass)) return bad('Fill the sender email and app password before turning email on');
  const { error } = await w.db.from('email_settings').upsert({ tenant_id: w.tenant, enabled: !!b.enabled, sender_email: sender || null, app_password: pass, from_name: String(b.from_name || '').trim() || null, updated_at: new Date().toISOString() });
  return error ? bad(error.message) : NextResponse.json({ ok: true });
}
// Send a test email with the saved settings
export async function POST(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const { to } = await req.json().catch(() => ({}));
  if (!isMail(String(to || ''))) return bad('Enter a valid email address');
  const { data: r } = await w.db.from('email_settings').select('*').eq('tenant_id', w.tenant).maybeSingle();
  const cfg = rowToEmailCfg(r); if (!cfg) return bad('Save the sender email and app password first');
  try { await sendEmail({ ...cfg, name: cfg.name || w.name }, String(to), 'Maxx ERP test email', `<b>This is a test email from ${w.name || 'your business'}. Email sending is working.</b>`); return NextResponse.json({ ok: true }); }
  catch (e) { return bad(`Could not send: ${String(e.message || e)}`, 502); }
}
