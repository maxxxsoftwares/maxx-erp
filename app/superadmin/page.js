'use client';
// Super admin sign-in. Not linked from the public sign-in page: open /superadmin directly.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useT } from '../../lib/i18n';
export default function SuperAdminLogin() {
  const { t } = useT(); const r = useRouter(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithPassword(f);
    if (error) { setErr(error.message); setBusy(false); return; }
    r.push('/admin');
  }
  return (<><div className="bar"><b>{t('app')}</b></div><div className="wrap"><form className="card" onSubmit={go}>
    <h1>{t('adminLogin')}</h1>
    <label>{t('email')}</label><input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
    <label>{t('password')}</label><input type="password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
    {err && <div className="err">{err}</div>}<button className="full" disabled={busy}>{busy ? t('loading') : t('login')}</button></form></div></>);
}
