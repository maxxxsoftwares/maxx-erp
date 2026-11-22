'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useT } from '../../lib/i18n';
export default function Companies() {
  const { t, toggle } = useT(); const r = useRouter(); const [list, setList] = useState([]); const [err, setErr] = useState('');
  useEffect(() => { supabase.from('user_tenants').select('tenants(id,name,code,setup_type)').then(({ data }) => setList((data || []).map(x => x.tenants).filter(Boolean))); }, []);
  async function open(id) { const { error } = await supabase.rpc('switch_tenant', { tid: id }); if (error) return setErr(error.message); r.push('/dashboard'); }
  return (<><div className="bar"><b>{t('companies')}</b><button className="ghost" onClick={toggle}>{t('lang')}</button></div>
    <div className="wrap"><div className="card">{list.map(x => <div className="row" key={x.id}><div><b>{x.name}</b><div className="muted">{x.code} · {t(x.setup_type)}</div></div><button onClick={() => open(x.id)}>{t('open')}</button></div>)}
      {err && <div className="err">{err}</div>}</div><button className="ghost" style={{ color: 'var(--pine)' }} onClick={() => r.push('/dashboard')}>{t('home')}</button></div></>);
}
