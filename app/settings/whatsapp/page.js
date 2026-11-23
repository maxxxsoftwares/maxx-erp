'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useT } from '../../../lib/i18n';
const blank = { enabled: false, provider: 'ultramsg', api_url: '', instance_id: '', token: '', country_code: '91' };
export default function WhatsAppSettings() {
  const { t } = useT(); const [f, setF] = useState(blank); const [hint, setHint] = useState(''); const [to, setTo] = useState('');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false);
  const call = async (method, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/settings/whatsapp', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(res.status === 403 ? t('waOnlyAdmin') : j.error || t('error')); return j;
  };
  useEffect(() => { call('GET').then(j => { if (j.settings) setF({ ...blank, ...j.settings, token: '' }); setHint(j.tokenHint || ''); }).catch(e => setErr(e.message)).finally(() => setReady(true)); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    try { await call('PUT', f); setMsg(t('waSaved')); if (f.token) { setHint(f.token.slice(-4)); setF({ ...f, token: '' }); } } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  async function test(e) {
    e.preventDefault(); setBusy(true); setErr(''); setMsg('');
    try { await call('POST', { mobile: to }); setMsg(t('waSent')); } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  if (!ready) return <div className="wrap"><p className="muted">{t('loading')}</p></div>;
  return (<div className="wrap">
    <h1>{t('whatsappApi')}</h1>
    <form className="card" onSubmit={save}>
      <label className="lg-rem" style={{ margin: 0 }}><input type="checkbox" checked={f.enabled} onChange={e => setF({ ...f, enabled: e.target.checked })} /> {t('waEnable')}</label>
      <label>{t('waProvider')}</label>
      <select value={f.provider} onChange={set('provider')}><option value="ultramsg">{t('waProvUltra')}</option><option value="greenapi">{t('waProvGreen')}</option></select>
      <label>{t('waUrl')}</label><input value={f.api_url} onChange={set('api_url')} placeholder="https://api.ultramsg.com" autoComplete="off" />
      <label>{t('waInstance')}</label><input value={f.instance_id} onChange={set('instance_id')} placeholder="instance12345" autoComplete="off" />
      <label>{t('waToken')}</label>
      <input type="password" value={f.token} onChange={set('token')} autoComplete="new-password" placeholder={hint ? `•••••••• (${t('waTokenSaved')} …${hint})` : ''} />
      {hint && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('waTokenKeep')}</div>}
      <label>{t('waCountry')}</label><input inputMode="numeric" value={f.country_code} onChange={set('country_code')} style={{ maxWidth: 120 }} />
      <p className="muted" style={{ fontSize: 13 }}>{t('waNote')}</p>
      {err && <div className="err" role="alert">{err}</div>}{msg && <div className="ok">{msg}</div>}
      <button className="full gold" disabled={busy}>{t('save')}</button>
    </form>
    <form className="card" onSubmit={test}>
      <b>{t('waTest')}</b>
      <label>{t('waTestTo')}</label><input required inputMode="numeric" maxLength={10} value={to} onChange={e => setTo(e.target.value)} placeholder="9876543210" />
      <button className="full" disabled={busy}>{t('waSend')}</button>
    </form>
  </div>);
}
