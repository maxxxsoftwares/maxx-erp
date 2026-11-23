'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useT } from '../../../lib/i18n';
export default function EmailSettings() {
  const { t } = useT(); const [f, setF] = useState({ enabled: false, sender_email: '', app_password: '', from_name: '' });
  const [hint, setHint] = useState(''); const [to, setTo] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false);
  const call = async (method, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/settings/email', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(res.status === 403 ? t('waOnlyAdmin') : j.error || t('error')); return j;
  };
  useEffect(() => { call('GET').then(j => { if (j.settings) setF({ ...j.settings, app_password: '' }); setHint(j.passHint || ''); }).catch(e => setErr(e.message)).finally(() => setReady(true)); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const run = async fn => { setBusy(true); setErr(''); setMsg(''); try { await fn(); } catch (x) { setErr(x.message); } setBusy(false); };
  const save = e => { e.preventDefault(); run(async () => { await call('PUT', f); setMsg(t('waSaved')); if (f.app_password) { setHint(f.app_password.replace(/\s/g, '').slice(-2)); setF({ ...f, app_password: '' }); } }); };
  const test = e => { e.preventDefault(); run(async () => { await call('POST', { to }); setMsg(t('emSent')); }); };
  if (!ready) return <div className="wrap"><p className="muted">{t('loading')}</p></div>;
  return (<div className="wrap">
    <h1>{t('emailSettings')}</h1>
    <form className="card" onSubmit={save}>
      <label className="lg-rem" style={{ margin: 0 }}><input type="checkbox" checked={f.enabled} onChange={e => setF({ ...f, enabled: e.target.checked })} /> {t('emEnable')}</label>
      <label>{t('emSender')}</label><input type="email" value={f.sender_email} onChange={set('sender_email')} placeholder="yourfirm@gmail.com" autoComplete="off" />
      <label>{t('emPass')}</label><input type="password" value={f.app_password} onChange={set('app_password')} autoComplete="new-password" placeholder={hint ? `•••••••• (${t('waTokenSaved')} …${hint})` : ''} />
      {hint && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{t('emKeep')}</div>}
      <label>{t('emName')}</label><input value={f.from_name} onChange={set('from_name')} placeholder="Maxx Finance" />
      <p className="muted" style={{ fontSize: 13 }}>{t('emNote')}</p>
      {err && <div className="err" role="alert">{err}</div>}{msg && <div className="ok">{msg}</div>}
      <button className="full gold" disabled={busy}>{t('waUpdate')}</button>
    </form>
    <form className="card" onSubmit={test}>
      <b>{t('emTest')}</b>
      <label>{t('emTestTo')}</label><input type="email" required value={to} onChange={e => setTo(e.target.value)} placeholder="name@example.com" />
      <button className="full" disabled={busy}>{t('emSendTest')}</button>
    </form>
  </div>);
}
