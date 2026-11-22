'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, toEmail } from '../lib/supabase';
import { useT } from '../lib/i18n';
export default function Login() {
  const { t, toggle } = useT(); const r = useRouter();
  const [admin, setAdmin] = useState(false);
  const [f, setF] = useState({ code:'', mobile:'', email:'', password:'' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const email = admin ? f.email : toEmail(f.code, f.mobile);
    const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
    if (error) { setErr(error.message); setBusy(false); return; }
    r.push(admin ? '/admin' : '/dashboard');
  }
  return (<>
    <div className="bar"><b>{t('app')}</b><button className="ghost" onClick={toggle}>{t('lang')}</button></div>
    <div className="wrap"><form className="card" onSubmit={go}>
      <h1>{admin ? t('adminLogin') : t('login')}</h1>
      {admin ? <><label>{t('email')}</label><input type="email" required value={f.email} onChange={set('email')} /></> : <>
        <label>{t('tenantCode')}</label><input required value={f.code} onChange={set('code')} autoCapitalize="none" />
        <label>{t('mobile')}</label><input required inputMode="numeric" value={f.mobile} onChange={set('mobile')} /></>}
      <label>{t('password')}</label><input type="password" required value={f.password} onChange={set('password')} />
      {err && <div className="err">{err}</div>}
      <button className="full" disabled={busy}>{busy ? t('loading') : t('login')}</button>
      <p className="muted" style={{ textAlign:'center', marginTop:16 }}>
        <a href="#" onClick={e => { e.preventDefault(); setAdmin(!admin); }}>{admin ? t('login') : t('adminLogin')}</a></p>
    </form></div></>);
}
