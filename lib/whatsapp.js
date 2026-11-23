// Server-only: encrypted secrets + sending through your own WhatsApp server (the same API the desktop software uses)
import crypto from 'crypto';
const key = () => crypto.createHash('sha256').update(process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev').digest();
export function encrypt(text) {
  if (!text) return null; const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(text, 'utf8'), c.final()]); return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.');
}
export function decrypt(s) {
  try { if (!s) return ''; const [iv, tag, enc] = s.split('.').map(x => Buffer.from(x, 'base64')); const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8'); } catch { return ''; }
}
// The server will call this address, so refuse localhost and private networks (http or https)
export function publicUrl(u) {
  try { const x = new URL(u); if (!['http:', 'https:'].includes(x.protocol)) return false; const h = x.hostname.toLowerCase();
    return !(h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '::1' || h === '[::1]' || /^(127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)); } catch { return false; }
}
export const rowToCfg = r => r && r.api_url && r.instance_id && r.token ? { url: r.api_url, instance: r.instance_id, token: decrypt(r.token), cc: r.country_code || '91' } : null;
// The business's own settings if turned on, otherwise the platform default from .env.local
export async function loadWaConfig(db, tenantId) {
  const { data } = await db.from('whatsapp_settings').select('*').eq('tenant_id', tenantId).maybeSingle();
  if (data?.enabled) { const c = rowToCfg(data); if (c) return c; }
  const e = process.env;
  return e.WHATSAPP_API_URL && e.WHATSAPP_INSTANCE_ID && e.WHATSAPP_TOKEN ? { url: e.WHATSAPP_API_URL, instance: e.WHATSAPP_INSTANCE_ID, token: e.WHATSAPP_TOKEN, cc: '91' } : null;
}
const phone = (cc, n) => { const d = String(n).replace(/\D/g, ''); return d.length > 10 && d.startsWith(cc) ? d : cc + d; };
async function check(res) {
  const body = await res.text(); let j = null; try { j = JSON.parse(body); } catch {}
  if (!res.ok || !(j && (j.success === true || j.status === 'DISPATCHED'))) throw new Error(`WhatsApp server: ${(j && (j.error || j.status)) || body.slice(0, 120) || res.status}`);
}
// GET {url}/instance/send?instanceId=&token=&to=&message=
export async function sendWhatsApp(cfg, mobile, text) {
  if (!cfg) {
    if (process.env.NODE_ENV !== 'production') { console.log(`\n[DEV] WhatsApp is not configured. Message for ${mobile}:\n${text}\n`); return; }
    throw new Error('WhatsApp is not configured');
  }
  const url = `${cfg.url.replace(/\/$/, '')}/instance/send?instanceId=${encodeURIComponent(cfg.instance)}&token=${encodeURIComponent(cfg.token)}&to=${encodeURIComponent(phone(cfg.cc, mobile))}&message=${encodeURIComponent(text)}`;
  await check(await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' }));
}
// POST {url}/instance/send-pdf (multipart: instanceId, token, to, filename, message, file). Ready for receipts and invoices.
export async function sendWhatsAppPdf(cfg, mobile, text, filename, bytes) {
  if (!cfg) throw new Error('WhatsApp is not configured');
  const fd = new FormData(); fd.append('instanceId', cfg.instance); fd.append('token', cfg.token); fd.append('to', phone(cfg.cc, mobile));
  fd.append('filename', filename); fd.append('message', text); fd.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
  await check(await fetch(`${cfg.url.replace(/\/$/, '')}/instance/send-pdf`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) }));
}
