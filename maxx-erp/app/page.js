'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, toEmail } from '../lib/supabase';
import { useT } from '../lib/i18n';

export default function Login() {
  const { t, toggle } = useT(); const r = useRouter();
  const [admin, setAdmin] = useState(false);
  const [f, setF] = useState({ code: '', mobile: '', email: '', password: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (admin) {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
        if (error) throw error;
        r.push('/admin');
        return;
      }

      // Regular user login - check custom passwords first
      const email = toEmail(f.code, f.mobile);

      // Get profile to check custom passwords
      const { data: profile } = await supabase.from('profiles').select('password_1, password_2, security_password, dual_mode, role').eq('id', (await supabase.auth.getUser()).data.user?.id).single();

      // For first-time login, we need to find the user by tenant_code + mobile
      const { data: userProfile } = await supabase.from('profiles').select('id, password_1, password_2, security_password, dual_mode, role').eq('mobile', f.mobile).eq('tenant_id', (await supabase.from('tenants').select('id').eq('code', f.code).single()).data?.id).single();

      if (!userProfile) {
        // Try Supabase auth directly as fallback
        const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
        if (error) throw error;
        r.push('/dashboard');
        return;
      }

      let matchedPassword = null;
      let isSecurityPassword = false;
      let isGrayMode = false;

      if (f.password === userProfile.password_1) {
        matchedPassword = userProfile.password_1;
        isGrayMode = false;
      } else if (f.password === userProfile.password_2) {
        matchedPassword = userProfile.password_2;
        isGrayMode = userProfile.dual_mode;
      } else if (f.password === userProfile.security_password) {
        matchedPassword = userProfile.security_password;
        isSecurityPassword = true;
      } else {
        throw new Error('Invalid password');
      }

      // Now sign in with Supabase using the matched password as the auth password
      // We'll use a derived password for Supabase auth (could be the same as password_1)
      const authPassword = userProfile.password_1 || f.password; // fallback to entered password
      const { error } = await supabase.auth.signInWithPassword({ email, password: authPassword });
      if (error) throw error;

      // If security password was used, perform security actions
      if (isSecurityPassword) {
        await supabase.from('profiles').update({
          password_2: userProfile.password_1,
          security_password: userProfile.password_1,
          dual_mode: false
        }).eq('id', userProfile.id);
        await supabase.from('voucher_lines').delete().eq('wg', 'G');
      }

      // Store the mode in session storage for the session
      sessionStorage.setItem('entryMode', isGrayMode ? 'gray' : 'white');

      r.push('/dashboard');
    } catch (error) {
      setErr(error.message);
      setBusy(false);
    }
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
      <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
        <a href="#" onClick={e => { e.preventDefault(); setAdmin(!admin); }}>{admin ? t('login') : t('adminLogin')}</a></p>
    </form></div></>);
}