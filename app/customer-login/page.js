'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useT } from '../../lib/i18n';
const custEmail = (code, mobile) => `cust.${code.toLowerCase()}.${mobile}@maxxerp.app`;
export default function CustomerLogin() {
  const { t, toggle } = useT(); const r = useRouter();
  const [step, setStep] = useState('find');               // find | login | create
  const [f, setF] = useState({ code: '', mobile: '', password: '', pw2: '' });
  const [names, setNames] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function find(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const res = await fetch('/api/customer/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'check', code: f.code, mobile: f.mobile }) });
    const j = await res.json(); setBusy(false);
    if (!res.ok) return setErr(j.error || t('error'));
    setNames(j); setStep(j.hasLogin ? 'login' : 'create');
  }
  async function login(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword({ email: custEmail(f.code, f.mobile), password: f.password });
    setBusy(false); if (error) return setErr(error.message); r.push('/customer');
  }
  async function create(e) {
    e.preventDefault(); setErr('');
    if (f.password !== f.pw2) return setErr(t('pwMismatch'));
    setBusy(true);
    const res = await fetch('/api/customer/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', code: f.code, mobile: f.mobile, password: f.password }) });
    const j = await res.json(); if (!res.ok) { setBusy(false); return setErr(j.error || t('error')); }
    const { error } = await supabase.auth.signInWithPassword({ email: custEmail(f.code, f.mobile), password: f.password });
    setBusy(false); if (error) return setErr(error.message); r.push('/customer');
  }
  return (<div className="lg"><div className="sg-hero" style={{ flex: '0 0 220px', minHeight: 180 }}>
    <button className="sg-lang" onClick={toggle}>{t('lang')}</button>
    <div className="sg-brand"><span className="sg-logo"><img src="/logo.png" alt="" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/icon-192.png'; }} /></span><b>{t('customerLogin')}</b></div>
  </div>
  <div className="sg-sheet"><div className="sg-in-wrap">
    {step === 'find' && <form onSubmit={find}>
      <h1>{t('findAccount')}</h1>
      <input className="sg-in" placeholder={t('tenantCode')} value={f.code} onChange={set('code')} autoCapitalize="none" />
      <input className="sg-in" placeholder={t('mobilePh')} inputMode="numeric" maxLength={10} value={f.mobile} onChange={set('mobile')} />
      {err && <div className="err sg-msg">{err}</div>}
      <button className="sg-btn" disabled={busy}>{busy ? t('loading') : t('findAccount')}</button>
    </form>}
    {step === 'login' && <form onSubmit={login}>
      <h1>{t('login')}</h1><p className="sg-help">{names?.customerName}, {names?.businessName}</p>
      <input className="sg-in" type="password" placeholder={t('password')} value={f.password} onChange={set('password')} />
      {err && <div className="err sg-msg">{err}</div>}
      <button className="sg-btn" disabled={busy}>{busy ? t('loading') : t('login')}</button>
    </form>}
    {step === 'create' && <form onSubmit={create}>
      <h1>{t('setYourPassword')}</h1><p className="sg-help">{names?.customerName}, {names?.businessName}</p>
      <input className="sg-in" type="password" placeholder={t('newPassword2')} minLength={6} value={f.password} onChange={set('password')} />
      <input className="sg-in" type="password" placeholder={t('confirmNewPassword')} minLength={6} value={f.pw2} onChange={set('pw2')} />
      {err && <div className="err sg-msg">{err}</div>}
      <button className="sg-btn gold" disabled={busy}>{busy ? t('loading') : t('createAccountBtn')}</button>
    </form>}
    <p className="sg-links"><button type="button" className="lnk" onClick={() => r.push('/')}>{t('backToLogin')}</button></p>
  </div></div></div>);
}
