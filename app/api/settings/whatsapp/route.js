import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { encrypt, decrypt, publicHttps, rowToCfg, sendWhatsApp } from '../../../../lib/whatsapp';
export const runtime = 'nodejs';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Only the owner or a manager of the active business may read or change these settings
async function who(req) {
  const db = admin(), token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token); if (!user) return { status: 401 };
  const { data: p } = await db.from('profiles').select('tenant_id, role, name, tenants(name)').eq('id', user.id).maybeSingle();
  if (!p?.tenant_id) return { status: 401 };
  if (!['owner', 'manager'].includes(p.role)) return { status: 403 };
  return { db, tenant: p.tenant_id, name: p.tenants?.name || '' };
}
const deny = w => NextResponse.json({ error: w.status === 403 ? 'Only the owner or a manager can change these settings' : 'Unauthorized' }, { status: w.status });

export async function GET(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const { data: r } = await w.db.from('whatsapp_settings').select('*').eq('tenant_id', w.tenant).maybeSingle();
  const tk = r?.token ? decrypt(r.token) : '';
  return NextResponse.json({ settings: r ? { enabled: r.enabled, provider: r.provider, api_url: r.api_url || '', instance_id: r.instance_id || '', country_code: r.country_code } : null, tokenHint: tk ? tk.slice(-4) : '' });
}

export async function PUT(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const b = await req.json().catch(() => ({}));
  const url = String(b.api_url || '').trim(), inst = String(b.instance_id || '').trim(), cc = String(b.country_code || '91').replace(/\D/g, '') || '91';
  if (!['ultramsg', 'greenapi'].includes(b.provider)) return NextResponse.json({ error: 'Choose a provider' }, { status: 400 });
  if (url && !publicHttps(url)) return NextResponse.json({ error: 'The API URL must start with https:// and point to a public address' }, { status: 400 });
  const { data: old } = await w.db.from('whatsapp_settings').select('token').eq('tenant_id', w.tenant).maybeSingle();
  const token = String(b.token || '').trim() ? encrypt(String(b.token).trim()) : old?.token || null;   // blank keeps the saved token
  if (b.enabled && !(url && inst && token)) return NextResponse.json({ error: 'Fill the API URL, instance ID and token before turning WhatsApp on' }, { status: 400 });
  const { error } = await w.db.from('whatsapp_settings').upsert({ tenant_id: w.tenant, enabled: !!b.enabled, provider: b.provider, api_url: url || null, instance_id: inst || null, token, country_code: cc, updated_at: new Date().toISOString() });
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
}

// Send a test message using the saved settings
export async function POST(req) {
  const w = await who(req); if (!w.db) return deny(w);
  const { mobile } = await req.json().catch(() => ({}));
  if (!/^\d{10}$/.test(String(mobile || ''))) return NextResponse.json({ error: 'Enter a 10-digit mobile number' }, { status: 400 });
  const { data: r } = await w.db.from('whatsapp_settings').select('*').eq('tenant_id', w.tenant).maybeSingle();
  const cfg = rowToCfg(r); if (!cfg) return NextResponse.json({ error: 'Save the API URL, instance ID and token first' }, { status: 400 });
  if (!publicHttps(cfg.url)) return NextResponse.json({ error: 'The saved API URL is not a public https address' }, { status: 400 });
  try { await sendWhatsApp(cfg, String(mobile), `Maxx ERP: this is a test message from ${w.name || 'your business'}. WhatsApp sending is working.`); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: String(e.message || e) }, { status: 502 }); }
}
