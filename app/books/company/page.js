'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function Company() {
  const { t } = useT(); const b = useBooks(); const [f, setF] = useState({ gstin: '', pan: '', address: '', phone: '' }); const [msg, setMsg] = useState('');
  useEffect(() => { if (b.ready) supabase.from('company_profile').select('*').maybeSingle().then(({ data }) => data && setF({ gstin: data.gstin || '', pan: data.pan || '', address: data.address || '', phone: data.phone || '' })); }, [b.ready]);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function save(e) { e.preventDefault(); const { error } = await supabase.from('company_profile').upsert(f); setMsg(error ? error.message : t('saved')); }
  return (<Shell title={t('company')} company={b.tenant?.name}><form onSubmit={save} style={{ maxWidth: 420 }}>
    <label>GSTIN</label><input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value.toUpperCase() })} maxLength={15} />
    <label>PAN</label><input value={f.pan} onChange={e => setF({ ...f, pan: e.target.value.toUpperCase() })} maxLength={10} />
    <label>{t('address')}</label><input value={f.address} onChange={set('address')} />
    <label>{t('mobile')}</label><input value={f.phone} onChange={set('phone')} />
    {msg && <div className="ok">{msg}</div>}<button className="full gold">{t('save')}</button></form></Shell>);
}
