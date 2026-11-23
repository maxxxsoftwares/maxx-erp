import { NextResponse } from 'next/server';
import { who, deny } from '../../../../lib/settingsAuth';
import { encrypt, decrypt, publicUrl, rowToCfg, sendWhatsApp } from '../../../../lib/whatsapp';
export const runtime = 'nodejs';
const base = u => String(u || '').trim().replace(/\/$/, '');
const bad = (m, s = 400) => NextResponse.json({ error: m }, { status: s });
const call = (url, opt = {}) => fetch(url, { ...opt, signal: AbortSignal.timeout(15000), cache: 'no-store' });

export async function GET(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const { data: r } = await w.db.from('whatsapp_settings').select('*').eq('tenant_id', w.tenant).maybeSingle();
  const tk = r?.token ? decrypt(r.token) : '';
  return NextResponse.json({ settings: r ? { enabled: r.enabled, api_url: r.api_url || '', instance_id: r.instance_id || '', country_code: r.country_code } : null, tokenHint: tk ? tk.slice(-4) : '' });
}

// Update: save URL, instance id, token (blank keeps the saved token), on/off
export async function PUT(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const b = await req.json().catch(() => ({}));
  const url = base(b.api_url), inst = String(b.instance_id || '').trim(), cc = String(b.country_code || '91').replace(/\D/g, '') || '91';
  if (url && !publicUrl(url)) return bad('Enter a valid public server address, like http://129.225.86.148:3000');
  const { data: old } = await w.db.from('whatsapp_settings').select('token').eq('tenant_id', w.tenant).maybeSingle();
  const token = String(b.token || '').trim() ? encrypt(String(b.token).trim()) : old?.token || null;
  if (b.enabled && !(url && inst && token)) return bad('Fill the URL, instance ID and token (or generate them) before turning WhatsApp on');
  const { error } = await w.db.from('whatsapp_settings').upsert({ tenant_id: w.tenant, enabled: !!b.enabled, api_url: url || null, instance_id: inst || null, token, country_code: cc, updated_at: new Date().toISOString() });
  return error ? bad(error.message) : NextResponse.json({ ok: true });
}

// Actions: request-otp, verify-otp (creates the instance and token), status (QR / connected), test
export async function POST(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const b = await req.json().catch(() => ({})), act = b.action;
  const { data: saved } = await w.db.from('whatsapp_settings').select('*').eq('tenant_id', w.tenant).maybeSingle();
  const url = base(b.url || saved?.api_url);
  if (!url || !publicUrl(url)) return bad('Enter a valid public server address, like http://129.225.86.148:3000');
  try {
    if (act === 'request-otp') {
      const res = await call(`${url}/instance/register/request-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await res.json().catch(() => ({}));
      if (!j.success || !j.requestId) return bad(j.error || 'The server did not send an OTP', 502);
      return NextResponse.json({ requestId: j.requestId });
    }
    if (act === 'verify-otp') {
      if (!b.requestId || !/^\d{6}$/.test(String(b.otp || '').trim())) return bad('Enter the 6-digit OTP');
      const res = await call(`${url}/instance/register/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: b.requestId, otp: String(b.otp).trim() }) });
      const j = await res.json().catch(() => ({}));
      if (!j.success || !j.instanceId || !j.token) return bad(j.error || 'The OTP is wrong or has expired', 400);
      // the token is saved straight on the server and never goes to the browser
      const { error } = await w.db.from('whatsapp_settings').upsert({ tenant_id: w.tenant, api_url: url, instance_id: j.instanceId, token: encrypt(j.token), updated_at: new Date().toISOString() });
      if (error) return bad(error.message);
      return NextResponse.json({ instanceId: j.instanceId, tokenHint: String(j.token).slice(-4) });
    }
    if (act === 'status') {
      const inst = String(b.instance || saved?.instance_id || '').trim(), tok = String(b.token || '').trim() || (saved?.token ? decrypt(saved.token) : '');
      if (!inst || !tok) return bad('Generate or enter an instance ID and token first');
      const res = await call(`${url}/instance/status?instanceId=${encodeURIComponent(inst)}&token=${encodeURIComponent(tok)}&json=true`);
      const body = await res.text(); let j = {}; try { j = JSON.parse(body); } catch {}
      if (!res.ok) return bad(`Server error (${res.status}): ${(j.error || body).toString().slice(0, 150)}`, 502);
      return NextResponse.json({ status: j.status || '', qr: j.status === 'QR_READY' ? j.qrCodeDataUrl || '' : '' });
    }
    if (act === 'test') {
      if (!/^\d{10}$/.test(String(b.mobile || ''))) return bad('Enter a 10-digit mobile number');
      const cfg = rowToCfg(saved); if (!cfg) return bad('Save the URL, instance ID and token first');
      await sendWhatsApp(cfg, String(b.mobile), `Maxx ERP: this is a test message from ${w.name || 'your business'}. WhatsApp sending is working.`);
      return NextResponse.json({ ok: true });
    }
    return bad('Unknown action');
  } catch (e) { return bad(`Could not reach the WhatsApp server: ${String(e.message || e)}`, 502); }
}
