// Server-only: WhatsApp sending + encrypted token storage
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
// Public https addresses only: the server will call this URL, so refuse localhost and private networks
export function publicHttps(u) {
  try { const x = new URL(u); if (x.protocol !== 'https:') return false; const h = x.hostname.toLowerCase();
    return !(h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '::1' || /^(127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)); } catch { return false; }
}
export const rowToCfg = r => r && r.api_url && r.instance_id && r.token ? { provider: r.provider, url: r.api_url, instance: r.instance_id, token: decrypt(r.token), cc: r.country_code || '91' } : null;
// The business's own settings if enabled, otherwise the platform default from .env.local
export async function loadWaConfig(db, tenantId) {
  const { data } = await db.from('whatsapp_settings').select('*').eq('tenant_id', tenantId).maybeSingle();
  if (data?.enabled) { const c = rowToCfg(data); if (c) return c; }
  const e = process.env;
  return e.WHATSAPP_API_URL && e.WHATSAPP_INSTANCE_ID && e.WHATSAPP_TOKEN ? { provider: 'ultramsg', url: e.WHATSAPP_API_URL, instance: e.WHATSAPP_INSTANCE_ID, token: e.WHATSAPP_TOKEN, cc: '91' } : null;
}
export async function sendWhatsApp(cfg, mobile, text) {
  if (!cfg) {
    if (process.env.NODE_ENV !== 'production') { console.log(`\n[DEV] WhatsApp is not configured. Message for ${mobile}:\n${text}\n`); return; }
    throw new Error('WhatsApp is not configured');
  }
  const base = cfg.url.replace(/\/$/, ''), to = cfg.cc + mobile; let res;
  if (cfg.provider === 'greenapi')
    res = await fetch(`${base}/waInstance${cfg.instance}/sendMessage/${cfg.token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: to + '@c.us', message: text }) });
  else
    res = await fetch(`${base}/${cfg.instance}/messages/chat`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: cfg.token, to, body: text }) });
  if (!res.ok) throw new Error(`The WhatsApp service replied with status ${res.status}`);
  const j = await res.json().catch(() => null);                       // some services answer 200 with an error inside
  if (j && j.error) throw new Error(typeof j.error === 'string' ? j.error : JSON.stringify(j.error));
}
