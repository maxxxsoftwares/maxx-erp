'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, toEmail } from '../../../lib/supabase';
import { useT } from '../../../lib/i18n';
import Link from 'next/link';

export default function CustomerLogin() {
  const { t, toggle } = useT(); const r = useRouter();
  const [f, setF] = useState({ mobile: '', password: '', tenantCode: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [customerData, setCustomerData] = useState(null);

  const set = k => e => setF({ ...f, [k]: e.target.value });

  async function findCustomer(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      // Find tenant by code
      const { data: tenant } = await supabase.from('tenants').select('id').eq('code', f.tenantCode).single();
      if (!tenant) throw new Error('Invalid business code');

      // Find ledger with this mobile in this tenant
      const { data: ledger } = await supabase.from('ledgers').select('id, name, mobile, customer_password, is_customer, tenant_id').eq('mobile', f.mobile).eq('tenant_id', tenant.id).single();
      if (!ledger) throw new Error('Customer not found');
      if (!ledger.is_customer) throw new Error('This account is not enabled for customer portal');

      setCustomerData(ledger);
      setBusy(false);

      if (!ledger.customer_password) {
        setShowSetPassword(true);
        setErr('');
      }
    } catch (error) {
      setErr(error.message);
      setBusy(false);
    }
  }

  async function loginOrSetPassword(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (showSetPassword) {
        // Set password for first time
        const { error } = await supabase.from('ledgers').update({ customer_password: f.password }).eq('id', customerData.id);
        if (error) throw error;
        setShowSetPassword(false);
        setErr('');
        // Continue to login
      }

      // Login with tenant code + mobile + customer_password
      const email = toEmail(f.tenantCode, f.mobile);
      const { error } = await supabase.auth.signInWithPassword({ email, password: f.password });
      if (error) throw error;

      r.push('/customer/dashboard');
    } catch (error) {
      setErr(error.message);
      setBusy(false);
    }
  }

  return (<>
    <div className="bar"><b>{t('app')}</b><button className="ghost" onClick={toggle}>{t('lang')}</button></div>
    <div className="wrap"><form className="card" onSubmit={showSetPassword ? loginOrSetPassword : findCustomer}>
      <h1>{showSetPassword ? t('setPassword') : t('customerPortal')}</h1>
      {!showSetPassword && (
        <>
          <label>{t('tenantCode')}</label><input required value={f.tenantCode} onChange={set('tenantCode')} autoCapitalize="none" placeholder="Business code" />
          <label>{t('mobile')}</label><input required inputMode="numeric" maxLength={10} value={f.mobile} onChange={set('mobile')} placeholder="10 digit mobile" />
          <button className="full" disabled={busy} type="submit">{busy ? t('loading') : t('login')}</button>
        </>
      )}
      {showSetPassword && (
        <>
          <p className="muted">{t('firstLogin')} - {t('setPassword')}</p>
          <label>{t('password')}</label><input type="password" required value={f.password} onChange={set('password')} minLength={6} />
          <label>{t('password2')}</label><input type="password" required value={f.password2 || ''} onChange={e => setF({ ...f, password2: e.target.value })} minLength={6} placeholder={t('password2')} />
          {err && <div className="err">{err}</div>}
          <button className="full gold" disabled={busy} type="submit">{busy ? t('loading') : t('save')}</button>
        </>
      )}
      {err && !showSetPassword && <div className="err">{err}</div>}
      <p className="muted" style={{ textAlign: 'center', marginTop: 16 }}>
        <Link href="/">{t('login')}</Link>
      </p>
    </form></div></>);
}