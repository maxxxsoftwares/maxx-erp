'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';

export default function PasswordSettings() {
  const { t } = useT(); const b = useBooks();
  const [f, setF] = useState({ password1: '', password2: '', securityPassword: '', currentPassword: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [dualMode, setDualMode] = useState(false);

  useEffect(() => {
    if (b.ready && b.user) {
      supabase.from('profiles').select('password_1, password_2, security_password, dual_mode, role').eq('id', b.user.id).single()
        .then(({ data }) => {
          if (data) {
            setDualMode(data.dual_mode || false);
            setIsAdmin(data.role === 'owner' || data.role === 'manager');
          }
        });
    }
  }, [b.ready, b.user]);

  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault(); setErr(''); setMsg('');

    // Verify current password
    const { data: profile } = await supabase.from('profiles').select('password_1, password_2, security_password').eq('id', b.user?.id).single();
    if (!profile) return setErr('Profile not found');

    const currentMatch = f.currentPassword === profile.password_1 ||
                        f.currentPassword === profile.password_2 ||
                        f.currentPassword === profile.security_password;
    if (!currentMatch) return setErr('Current password is incorrect');

    const newDualMode = f.password1 !== f.password2 && f.password2 !== '';
    const updates = {
      password_1: f.password1 || null,
      password_2: newDualMode ? f.password2 : null,
      dual_mode: newDualMode,
    };

    // Admin can update security password
    if (isAdmin && f.securityPassword) {
      updates.security_password = f.securityPassword;
    }

    // If security password entered by admin, reset everything to password1
    if (isAdmin && f.securityPassword && profile.security_password && f.securityPassword === profile.security_password) {
      updates.password_1 = f.password1 || profile.password_1;
      updates.password_2 = null;
      updates.security_password = f.password1 || profile.password_1;
      updates.dual_mode = false;

      // Remove all Gray mode entries (WG = 'G') from database
      await supabase.from('voucher_lines').delete().eq('wg', 'G');
      setMsg(t('saved') + ' - Security action: all passwords reset to Password 1, Gray entries removed');
    } else {
      setMsg(t('saved'));
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', b.user?.id);
    if (error) return setErr(error.message);

    setF({ password1: '', password2: '', securityPassword: '', currentPassword: '' });
    setDualMode(newDualMode);
  }

  return (<Shell title={t('passwordSettings')} company={b.tenant?.name}>
    <form onSubmit={save} style={{ maxWidth: 500 }}>
      <div className="card">
        <h3>{t('passwordSettings')}</h3>
        <label>{t('password1')}</label>
        <input type="password" required value={f.password1} onChange={set('password1')} placeholder={t('password1')} />

        <label>{t('password2')}</label>
        <input type="password" value={f.password2} onChange={set('password2')} placeholder={t('password2')} />
        <p className="muted" style={{fontSize:13}}>{t('dualMode')}: {t('whiteMode')} (blank WG) / {t('grayMode')} (WG=G)</p>

        {isAdmin && (
          <>
            <label style={{marginTop:16}}>{t('securityPassword')} ({t('adminOnly')})</label>
            <input type="password" value={f.securityPassword} onChange={set('securityPassword')} placeholder={t('securityPassword')} />
            <p className="muted" style={{fontSize:13}}>Enter to reset all passwords to Password 1 and remove all Gray entries</p>
          </>
        )}

        <label style={{marginTop:16}}>{t('currentPassword')}</label>
        <input type="password" required value={f.currentPassword} onChange={set('currentPassword')} placeholder="Enter current password" />
      </div>

      {err && <div className="err">{err}</div>}
      {msg && <div className="ok">{msg}</div>}
      <button className="full gold" type="submit">{t('save')}</button>
    </form>
  </Shell>);
}