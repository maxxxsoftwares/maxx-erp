'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function Company() {
  const { t } = useT(); const b = useBooks(); const [f, setF] = useState({ gstin: '', pan: '', address: '', phone: '' }); const [msg, setMsg] = useState('');
  const [welcome, setWelcome] = useState(''); const [upErr, setUpErr] = useState(''); const [uploading, setUploading] = useState(false);
  useEffect(() => { if (b.ready) supabase.from('company_profile').select('*').maybeSingle().then(({ data }) => { if (data) { setF({ gstin: data.gstin || '', pan: data.pan || '', address: data.address || '', phone: data.phone || '' }); setWelcome(data.welcome_image_url || ''); } }); }, [b.ready]);
  async function uploadWelcome(e) {
    const file = e.target.files?.[0]; if (!file) return; setUploading(true); setUpErr('');
    const { data: { session } } = await supabase.auth.getSession();
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/company/upload-welcome', { method: 'POST', headers: { Authorization: 'Bearer ' + (session?.access_token || '') }, body: fd });
    const j = await res.json().catch(() => ({})); setUploading(false);
    if (!res.ok) return setUpErr(j.error || t('error'));
    setWelcome(j.url);
  }
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function save(e) { e.preventDefault(); const { error } = await supabase.from('company_profile').upsert(f); setMsg(error ? error.message : t('saved')); }
  return (<Shell title={t('company')} company={b.tenant?.name}><form onSubmit={save} style={{ maxWidth: 420 }}>
    <label>GSTIN</label><input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value.toUpperCase() })} maxLength={15} />
    <label>PAN</label><input value={f.pan} onChange={e => setF({ ...f, pan: e.target.value.toUpperCase() })} maxLength={10} />
    <label>{t('address')}</label><input value={f.address} onChange={set('address')} />
    <label>{t('mobile')}</label><input value={f.phone} onChange={set('phone')} />
    {msg && <div className="ok">{msg}</div>}<button className="full gold">{t('save')}</button></form>
    {b.role === 'owner' && <div className="card" style={{ maxWidth: 420 }}>
      <label style={{ marginTop: 0 }}>{t('uploadWelcome')}</label>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>{t('uploadWelcomeHint')}</p>
      {welcome && <img src={welcome} alt="" style={{ maxWidth: '100%', borderRadius: 10, marginBottom: 10 }} />}
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadWelcome} disabled={uploading} />
      {uploading && <p className="muted">{t('uploading')}</p>}{upErr && <div className="err">{upErr}</div>}
    </div>}
  </Shell>);
}
