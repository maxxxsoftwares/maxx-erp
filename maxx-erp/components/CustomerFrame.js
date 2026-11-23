'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';

export default function CustomerFrame({ children }) {
  const { t } = useT(); const r = useRouter();
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return r.push('/customer/login');
      const { data } = await supabase.from('profiles').select('tenants(name)').eq('id', user.id).single();
      if (data?.tenants) setTenant(data.tenants);
    })();
  }, [r]);

  return (<div className="frame" style={{background:'#fafafa'}}>
    <div className="fbar" style={{background:'#fff',borderBottom:'1px solid var(--line)',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
      <b className="fname" style={{color:'var(--pine)'}}>{tenant?.name || 'Customer Portal'}</b>
    </div>
    <main className="fmain" style={{flex:1,minWidth:0,background:'#fafafa'}}>{children}</main>
  </div>);
}