'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useT } from '../../lib/i18n';
const blank = { name:'', code:'', setup_type:'accounts_only', owner_name:'', mobile:'', password:'', expiry_date:'', user_limit:5, gold_trade:false, silver_trade:false };
export default function Admin() {
  const { t, toggle } = useT(); const r = useRouter();
  const [list, setList] = useState([]); const [f, setF] = useState(blank);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [ready, setReady] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const [lk, setLk] = useState({ from_code: '', mobile: '', tenant_id: '' });
  async function linkOwner(e) {
    e.preventDefault(); setErr(''); setMsg('');
    const res = await fetch('/api/tenants', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() }, body: JSON.stringify(lk) });
    const j = await res.json(); if (!res.ok) return setErr(j.error || t('error')); setMsg(t('saved')); setLk({ from_code: '', mobile: '', tenant_id: '' });
  }
  const token = async () => (await supabase.auth.getSession()).data.session?.access_token;
  const load = async () => { const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending:false }); setList(data || []); };
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return r.replace('/');
    const { data } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single();
    if (!data?.is_super_admin) return r.replace('/');
    setReady(true); load();
  })(); }, []);
  async function create(e) {
    e.preventDefault(); setErr(''); setMsg('');
    const res = await fetch('/api/tenants', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + await token() }, body: JSON.stringify({ ...f, user_limit:+f.user_limit }) });
    const j = await res.json();
    if (!res.ok) return setErr(j.error || t('error'));
    setMsg(t('created')); setF(blank); load();
  }
  async function toggleStatus(x) {
    await fetch('/api/tenants', { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + await token() }, body: JSON.stringify({ id:x.id, status: x.status === 'active' ? 'suspended' : 'active' }) });
    load();
  }
  if (!ready) return <div className="wrap">{t('loading')}</div>;
  return (<>
    <div className="bar"><b>{t('app')}</b>
      <span><button className="ghost" onClick={toggle}>{t('lang')}</button>{' '}
      <button className="ghost" onClick={async () => { await supabase.auth.signOut(); r.push('/'); }}>{t('signOut')}</button></span></div>
    <div className="wrap">
      <form className="card" onSubmit={create}>
        <h2>{t('newBusiness')}</h2>
        <label>{t('businessName')}</label><input required value={f.name} onChange={set('name')} />
        <label>{t('tenantCode')}</label><input required value={f.code} onChange={set('code')} autoCapitalize="none" />
        <label>{t('setupType')}</label>
        <select value={f.setup_type} onChange={set('setup_type')}>
          {['jewellery','general','girvi_loan','accounts_only'].map(s => <option key={s} value={s}>{t(s)}</option>)}
        </select>
        <label>{t('ownerName')}</label><input required value={f.owner_name} onChange={set('owner_name')} />
        <label>{t('mobile')}</label><input required inputMode="numeric" maxLength={10} value={f.mobile} onChange={set('mobile')} />
        <label>{t('password')}</label><input required minLength={6} value={f.password} onChange={set('password')} />
        <label>{t('expiry')}</label><input type="date" value={f.expiry_date} onChange={set('expiry_date')} />
        <label>{t('userLimit')}</label><input type="number" min="1" value={f.user_limit} onChange={set('user_limit')} />
        <label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" style={{width:'auto',minHeight:0}} checked={f.gold_trade} onChange={e=>setF({...f,gold_trade:e.target.checked})}/>{t('goldTrade')}</label>
        <label style={{display:'flex',gap:8,alignItems:'center'}}><input type="checkbox" style={{width:'auto',minHeight:0}} checked={f.silver_trade} onChange={e=>setF({...f,silver_trade:e.target.checked})}/>{t('silverTrade')}</label>
        {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
        <button className="full gold">{t('create')}</button>
      </form>
      <form className="card" onSubmit={linkOwner}><h2>{t('linkOwner')}</h2>
        <label>{t('tenantCode')}</label><input required value={lk.from_code} onChange={e => setLk({ ...lk, from_code: e.target.value })} />
        <label>{t('mobile')}</label><input required value={lk.mobile} onChange={e => setLk({ ...lk, mobile: e.target.value })} />
        <label>{t('businesses')}</label><select required value={lk.tenant_id} onChange={e => setLk({ ...lk, tenant_id: e.target.value })}><option value="" />{list.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <button className="full">{t('save')}</button></form>
      <div className="card"><h2>{t('businesses')}</h2>
        {!list.length && <p className="muted">{t('none')}</p>}
        {list.map(x => <div className="row" key={x.id}>
          <div><b>{x.name}</b><div className="muted">{x.code} · {t(x.setup_type)} · {x.status}</div></div>
          <button className="ghost" onClick={() => toggleStatus(x)}>{x.status === 'active' ? t('suspend') : t('activate')}</button>
        </div>)}
      </div>
    </div></>);
}
