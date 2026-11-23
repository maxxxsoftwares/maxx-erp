'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useT, MODULES } from '../../lib/i18n';
const BOOKS = { accounts: '/books', parties: '/books/ledgers', reports: '/books/trial', sales: '/books/voucher/sales' };
const href = (m, st) => st === 'girvi_loan' ? ({ loans: '/girvi', pledge: '/girvi', interest: '/girvi/report', notices: '/girvi', parties: '/girvi', reports: '/girvi/report' })[m]
  : st === 'jewellery' && ['tags', 'stock'].includes(m) ? '/jewellery' : st === 'jewellery' && ['karigar', 'mfg'].includes(m) ? '/jewellery/karigar' : BOOKS[m];
export default function Dashboard() {
  const { t } = useT(); const r = useRouter(); const [p, setP] = useState(null); const [many, setMany] = useState(false);
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return r.replace('/');
    const { data } = await supabase.from('profiles').select('name, tenants(name, setup_type, status)').eq('id', user.id).single();
    if (!data?.tenants) return r.replace('/'); setP(data);
    const { count } = await supabase.from('user_tenants').select('tenant_id', { count: 'exact', head: true }); setMany((count || 0) > 1);
  })(); }, []);
  if (!p) return <div className="wrap">{t('loading')}</div>;
  const st = p.tenants.setup_type, mods = MODULES[st] || [];
  return (<div className="wrap"><h1>{t('welcome')}, {p.name}</h1><p className="muted">{t(st)}</p><h2>{t('modules')}</h2>
    <div className="grid">{mods.map(m => href(m, st) ? <a className="tile" key={m} href={href(m, st)} style={{ textDecoration: 'none', color: 'inherit' }}>{t('m_' + m)}</a> : <div className="tile" key={m}>{t('m_' + m)}</div>)}</div></div>);
}