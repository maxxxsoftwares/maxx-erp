'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useT } from '../../../lib/i18n';
export default function ChangePassword() {
  const { t } = useT(); const r = useRouter();
  const [f, setF] = useState({ cur: '', n1: '', n2: '' }); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function save(e) {
    e.preventDefault(); setErr(''); setMsg('');
    if (f.n1.length < 6) return setErr(t('pwTooShort'));
    if (f.n1 !== f.n2) return setErr(t('pwMismatch'));
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: reauth } = await supabase.auth.signInWithPassword({ email: user.email, password: f.cur });
    if (reauth) { setBusy(false); return setErr(t('pwWrong')); }
    const { error } = await supabase.auth.updateUser({ password: f.n1 });
    setBusy(false);
    if (error) return setErr(error.message);
    setMsg(t('pwUpdated')); setF({ cur: '', n1: '', n2: '' });
  }
  return (<div className="wrap"><h1>{t('changePassword')}</h1>
    <form className="card" onSubmit={save} style={{ maxWidth: 420 }}>
      <label>{t('currentPassword')}</label><input type="password" required value={f.cur} onChange={set('cur')} autoComplete="current-password" />
      <label>{t('newPassword2')}</label><input type="password" required minLength={6} value={f.n1} onChange={set('n1')} autoComplete="new-password" />
      <label>{t('confirmNewPassword')}</label><input type="password" required minLength={6} value={f.n2} onChange={set('n2')} autoComplete="new-password" />
      {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
      <button className="full gold" disabled={busy}>{busy ? t('loading') : t('save')}</button>
    </form>
    <button className="ghost" style={{ color: 'var(--pine)' }} onClick={() => r.push('/dashboard')}>{t('home')}</button>
  </div>);
}
