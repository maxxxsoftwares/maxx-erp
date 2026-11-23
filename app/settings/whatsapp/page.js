'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useT } from '../../../lib/i18n';
const DEFAULT_URL = 'http://129.225.86.148:3000';
export default function WhatsAppSettings() {
  const { t } = useT();
  const [f, setF] = useState({ enabled: false, api_url: DEFAULT_URL, instance_id: '', token: '', country_code: '91' });
  const [hint, setHint] = useState(''); const [to, setTo] = useState(''); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false);
  const [otp, setOtp] = useState(null); const [code, setCode] = useState('');
  const [polling, setPolling] = useState(false); const [status, setStatus] = useState(''); const [qr, setQr] = useState('');
  const call = async (method, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/settings/whatsapp', { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(res.status === 403 ? t('waOnlyAdmin') : j.error || t('error')); return j;
  };
  useEffect(() => { call('GET').then(j => { if (j.settings) setF(x => ({ ...x, ...j.settings, api_url: j.settings.api_url || DEFAULT_URL, token: '' })); setHint(j.tokenHint || ''); }).catch(e => setErr(e.message)).finally(() => setReady(true)); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const run = async fn => { setBusy(true); setErr(''); setMsg(''); try { await fn(); } catch (x) { setErr(x.message); } setBusy(false); };

  // Generate Instance / Token: the server texts an OTP to the administrator's WhatsApp
  const genToken = () => run(async () => { const j = await call('POST', { action: 'request-otp', url: f.api_url }); setOtp({ requestId: j.requestId }); setCode(''); setMsg(t('waOtpSent')); });
  const verify = () => run(async () => {
    const j = await call('POST', { action: 'verify-otp', url: f.api_url, requestId: otp.requestId, otp: code });
    setF(x => ({ ...x, instance_id: j.instanceId, token: '' })); setHint(j.tokenHint || ''); setOtp(null); setMsg(t('waVerified'));
  });
  // Generate QR: shows the QR to scan, then keeps checking until the phone is connected
  const genQr = () => { setErr(''); setMsg(''); setStatus(''); setQr(''); setPolling(true); };
  useEffect(() => {
    if (!polling) return; let on = true, timer;
    const tick = async () => {
      try {
        const j = await call('POST', { action: 'status', url: f.api_url, instance: f.instance_id, token: f.token });
        if (!on) return; setStatus(j.status); setQr(j.status === 'QR_READY' ? j.qr : '');
        if (j.status === 'CONNECTED') { setPolling(false); return; }
      } catch (x) { if (on) { setErr(x.message); setPolling(false); } return; }
      timer = setTimeout(tick, 3000);
    };
    tick(); return () => { on = false; clearTimeout(timer); };
  }, [polling]);
  const update = e => { e.preventDefault(); run(async () => { await call('PUT', f); setMsg(t('waSaved')); if (f.token) { setHint(f.token.slice(-4)); setF({ ...f, token: '' }); } }); };
  const test = e => { e.preventDefault(); run(async () => { await call('POST', { action: 'test', mobile: to }); setMsg(t('waSent')); }); };

  if (!ready) return <div className="wrap"><p className="muted">{t('loading')}</p></div>;
  return (<div className="wrap">
    <h1>{t('whatsappApi')}</h1>
    <form className="card" onSubmit={update}>
      <label>URL</label><input value={f.api_url} onChange={set('api_url')} placeholder={DEFAULT_URL} autoComplete="off" />
      <label>{t('waInstance')}</label><input value={f.instance_id} onChange={set('instance_id')} autoComplete="off" />
      <label>{t('waToken')}</label>
      <input type="password" value={f.token} onChange={set('token')} autoComplete="new-password" placeholder={hint ? `•••••••• (${t('waTokenSaved')} …${hint})` : ''} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <button type="button" className="ghost" style={{ color: 'var(--pine)' }} disabled={busy} onClick={genQr}>{t('waGenQr')}</button>
        <button type="button" className="ghost" style={{ color: 'var(--pine)' }} disabled={busy} onClick={genToken}>{t('waGenToken')}</button>
      </div>
      {otp && <div className="card" style={{ marginTop: 14, background: '#f1f5fd' }}>
        <label style={{ marginTop: 0 }}>{t('waOtpPrompt')}</label>
        <div style={{ display: 'flex', gap: 8 }}><input inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value)} style={{ letterSpacing: '.3em' }} />
          <button type="button" disabled={busy || code.length !== 6} onClick={verify}>{t('waVerify')}</button></div></div>}
      <label className="lg-rem" style={{ margin: '16px 0 0' }}><input type="checkbox" checked={f.enabled} onChange={e => setF({ ...f, enabled: e.target.checked })} /> {t('waEnable')}</label>
      <label>{t('waCountry')}</label><input inputMode="numeric" value={f.country_code} onChange={set('country_code')} style={{ maxWidth: 120 }} />
      <p className="muted" style={{ fontSize: 13 }}>{t('waNote')}</p>
      {err && <div className="err" role="alert">{err}</div>}{msg && <div className="ok">{msg}</div>}
      <button className="full gold" disabled={busy}>{t('waUpdate')}</button>
    </form>
    {(polling || status) && <div className="card" style={{ textAlign: 'center' }}>
      {status === 'CONNECTED' && <div className="ok">✓ {t('waConnected')}</div>}
      {status === 'INITIALIZING' && <p className="muted">{t('waInit')}</p>}
      {polling && !status && <p className="muted">{t('loading')}</p>}
      {qr && <><img src={qr} alt="WhatsApp QR code" width="260" height="260" style={{ maxWidth: '100%', height: 'auto' }} /><p className="muted">{t('waScan')}</p></>}
    </div>}
    <form className="card" onSubmit={test}>
      <b>{t('waTest')}</b>
      <label>{t('waTestTo')}</label><input required inputMode="numeric" maxLength={10} value={to} onChange={e => setTo(e.target.value)} placeholder="9876543210" />
      <button className="full" disabled={busy}>{t('waSend')}</button>
    </form>
  </div>);
}
