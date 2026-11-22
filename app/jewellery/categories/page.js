'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import JShell from '../jshell';
export default function Categories() {
  const { t } = useT(); const tn = useTenant(); const [list, setList] = useState([]); const [name, setName] = useState(''); const [err, setErr] = useState('');
  const load = () => supabase.from('item_categories').select('*').order('name').then(({ data }) => setList(data || []));
  useEffect(() => { if (tn.ready) load(); }, [tn.ready]);
  async function add(e) { e.preventDefault(); setErr(''); const { error } = await supabase.from('item_categories').insert({ name: name.trim() }); if (error) return setErr(error.message); setName(''); load(); }
  return (<JShell title={t('categories')} company={tn.tenant?.name}>
    <form onSubmit={add} style={{ display: 'flex', gap: 8, maxWidth: 420 }}><input required placeholder={t('catName')} value={name} onChange={e => setName(e.target.value)} /><button className="gold">{t('save')}</button></form>
    {err && <div className="err">{err}</div>}
    <table className="tt" style={{ marginTop: 12 }}><tbody>{list.map(c => <tr key={c.id}><td>{c.name}</td></tr>)}</tbody></table>
  </JShell>);
}
