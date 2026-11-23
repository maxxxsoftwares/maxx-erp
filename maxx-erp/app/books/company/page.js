'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';

export default function Company() {
  const { t } = useT(); const b = useBooks();
  const [f, setF] = useState({ gstin: '', pan: '', address: '', phone: '', welcome_image: '' });
  const [msg, setMsg] = useState(''); const [isAdmin, setIsAdmin] = useState(false);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (b.ready) {
      supabase.from('company_profile').select('*').maybeSingle().then(({ data }) => {
        if (data) {
          setF({ gstin: data.gstin || '', pan: data.pan || '', address: data.address || '', phone: data.phone || '', welcome_image: data.welcome_image || '' });
          if (data.welcome_image) setPreview(data.welcome_image);
        }
      });
      // Check if user is admin
      supabase.from('profiles').select('role').eq('id', b.user?.id).single().then(({ data }) => {
        if (data && (data.role === 'owner' || data.role === 'manager')) setIsAdmin(true);
      });
    }
  }, [b.ready, b.user]);

  const set = k => e => {
    if (k === 'welcome_image') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => { setPreview(reader.result); setF({ ...f, welcome_image: reader.result }); };
        reader.readAsDataURL(file);
      }
    } else {
      setF({ ...f, [k]: e.target.value });
    }
  };

  async function save(e) {
    e.preventDefault();
    const { error } = await supabase.from('company_profile').upsert(f);
    setMsg(error ? error.message : t('saved'));
  }

  return (<Shell title={t('company')} company={b.tenant?.name}><form onSubmit={save} style={{ maxWidth: 500 }}>
    <label>GSTIN</label><input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value.toUpperCase() })} maxLength={15} />
    <label>PAN</label><input value={f.pan} onChange={e => setF({ ...f, pan: e.target.value.toUpperCase() })} maxLength={10} />
    <label>{t('address')}</label><input value={f.address} onChange={set('address')} />
    <label>{t('mobile')}</label><input value={f.phone} onChange={set('phone')} />

    {isAdmin && (
      <div className="card" style={{marginTop:16}}>
        <label>{t('welcomeImage')} ({t('adminOnly')})</label>
        <input type="file" accept="image/*" onChange={set('welcome_image')} />
        {preview && <div style={{marginTop:8}}><img src={preview} alt="Welcome" style={{maxWidth:'100%',maxHeight:200,borderRadius:8,border:'1px solid var(--line)'}} /></div>}
        <p className="muted" style={{fontSize:13}}>{t('welcomeImage')} displayed on login/dashboard</p>
      </div>
    )}

    {msg && <div className="ok">{msg}</div>}<button className="full gold">{t('save')}</button></form></Shell>);
}