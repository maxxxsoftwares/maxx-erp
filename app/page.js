'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, toEmail } from '../lib/supabase';
import { useT } from '../lib/i18n';

const Eye = ({ off }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={off ? 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94 M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19 M1 1l22 22' : 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'} /></svg>;
const Art = () => (<svg className="sg-art" viewBox="0 0 300 210" aria-hidden="true">
  <rect x="42" y="34" width="216" height="164" rx="28" fill="#8fd3ee" />
  <rect x="104" y="14" width="94" height="186" rx="16" fill="#fff" /><rect x="136" y="22" width="30" height="4" rx="2" fill="#d6dcf0" />
  <rect x="128" y="86" width="46" height="46" rx="11" fill="#0a1464" /><path d="M137 124v-24l14 14 14-14v24" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
  <rect x="58" y="12" width="38" height="38" rx="9" fill="#3b82f6" /><text x="77" y="40" textAnchor="middle" fontSize="22" fontWeight="700" fill="#fff">₹</text>
  <rect x="222" y="40" width="34" height="34" rx="9" fill="#e879c9" /><rect x="231" y="55" width="16" height="12" rx="2" fill="#fff" /><path d="M234 55v-4a5 5 0 0 1 10 0v4" fill="none" stroke="#fff" strokeWidth="2.5" />
  <rect x="214" y="118" width="46" height="40" rx="10" fill="#7c5cf0" /><rect x="223" y="130" width="28" height="18" rx="4" fill="#fff" /><rect x="223" y="136" width="28" height="4" fill="#7c5cf0" />
  <rect x="44" y="104" width="38" height="38" rx="9" fill="#2fbf8f" /><path d="M54 132v-10 M63 132v-18 M72 132v-24" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
</svg>);

export default function Login() {
  const { t, toggle } = useT(); const r = useRouter();
  const [step, setStep] = useState('login');                       // login | forgot | reset
  const [f, setF] = useState({ code: '', mobile: '', password: '', otp: '', pw1: '', pw2: '' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false); const [slide, setSlide] = useState(0);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem('maxxLogin') || 'null'); if (s) setF(x => ({ ...x, code: s.code || '', mobile: s.mobile || '' })); } catch {} }, []);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setSlide(s => (s + 1) % 4), 4200); return () => clearInterval(id);
  }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const go = s => { setStep(s); setErr(''); setOk(''); setShow(false); };
  const post = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || t('error')); return j;
  };
  const idsOk = f.code.trim().length >= 3 && /^\d{10}$/.test(f.mobile);
  const valid = step === 'login' ? idsOk && f.password.length > 0 : step === 'forgot' ? idsOk : /^\d{6}$/.test(f.otp) && f.pw1.length >= 6 && f.pw1 === f.pw2;
  async function login(e) {
    e.preventDefault(); setBusy(true); setErr(''); setOk('');
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(f.code, f.mobile), password: f.password });
    if (error) { setErr(error.message); setBusy(false); return; }
    try { localStorage.setItem('maxxLogin', JSON.stringify({ code: f.code, mobile: f.mobile })); } catch {}
    r.push('/dashboard');
  }
  async function sendOtp(e) {
    e?.preventDefault(); setBusy(true); setErr(''); setOk('');
    try { await post('/api/auth/forgot', { code: f.code, mobile: f.mobile }); setStep('reset'); setOk(t('otpSent')); } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  async function reset(e) {
    e.preventDefault(); setErr(''); setOk(''); setBusy(true);
    try { await post('/api/auth/reset', { code: f.code, mobile: f.mobile, otp: f.otp, password: f.pw1 }); setF({ ...f, password: '', otp: '', pw1: '', pw2: '' }); setStep('login'); setOk(t('passwordChanged')); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  }
  const Msg = <>{err && <div className="err sg-msg" role="alert">{err}</div>}{ok && <div className="ok sg-msg">{ok}</div>}</>;
  const Ids = <>
    <input className="sg-in" aria-label={t('tenantCode')} placeholder={t('tenantCode')} value={f.code} onChange={set('code')} autoCapitalize="none" autoComplete="off" />
    <input className="sg-in" aria-label={t('mobile')} placeholder={t('mobilePh')} inputMode="numeric" maxLength={10} autoComplete="tel" value={f.mobile} onChange={set('mobile')} /></>;
  const Pw = (k, ph, ac) => <div className="sg-pw"><input className="sg-in" type={show ? 'text' : 'password'} aria-label={ph} placeholder={ph} autoComplete={ac} value={f[k]} onChange={set(k)} />
    <button type="button" className="sg-eye" aria-label={show ? t('hidePassword') : t('showPassword')} onClick={() => setShow(!show)}><Eye off={show} /></button></div>;
  const Btn = (label, cls = '') => <button className={'sg-btn ' + cls} disabled={!valid || busy}>{busy ? <><span className="spin" aria-hidden="true" />{t('loading')}</> : label}</button>;
  return (<div className="sg">
    <div className="sg-hero">
      <button className="sg-lang" onClick={toggle}>{t('lang')}</button>
      <div className="sg-brand"><span className="sg-logo"><img src="/logo.png" alt="" onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/icon-192.png'; }} /></span><b>Maxx ERP</b></div>
      <p className="sg-tag" key={slide}>{t('slide' + (slide + 1))}</p>
      <Art />
      <div className="sg-dots">{[0, 1, 2, 3].map(i => <button key={i} type="button" aria-label={`${i + 1} / 4`} className={i === slide ? 'on' : ''} onClick={() => setSlide(i)} />)}</div>
    </div>
    <div className="sg-sheet"><div className="sg-in-wrap">
      {step === 'login' && <form onSubmit={login}>
        <h1>{t('letsStart')}</h1>{Ids}<p className="sg-help">{t('helpMobile')}</p>{Pw('password', t('password'), 'current-password')}
        {Msg}{Btn(t('login'))}
        <p className="sg-links"><button type="button" className="lnk" onClick={() => go('forgot')}>{t('forgotPassword')}</button></p>
      </form>}
      {step === 'forgot' && <form onSubmit={sendOtp}>
        <h1>{t('forgotPassword')}</h1>{Ids}<p className="sg-help">{t('helpOtp')}</p>
        {Msg}{Btn(t('sendOtp'))}<p className="sg-links"><button type="button" className="lnk" onClick={() => go('login')}>{t('backToLogin')}</button></p>
      </form>}
      {step === 'reset' && <form onSubmit={reset}>
        <h1>{t('resetPassword')}</h1>
        <input className="sg-in" aria-label={t('enterOtp')} placeholder={t('enterOtp')} inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={f.otp} onChange={set('otp')} style={{ letterSpacing: '.3em' }} />
        {Pw('pw1', t('newPassword'), 'new-password')}{Pw('pw2', t('confirmPassword'), 'new-password')}
        {Msg}{Btn(t('resetPassword'))}
        <p className="sg-links"><button type="button" className="lnk" onClick={sendOtp} disabled={busy}>{t('resendOtp')}</button>{' · '}<button type="button" className="lnk" onClick={() => go('login')}>{t('backToLogin')}</button></p>
      </form>}
      <div className="sg-foot">© {new Date().getFullYear()} Maxx ERP</div>
    </div></div>
  </div>);
}
