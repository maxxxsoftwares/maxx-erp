'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, useHash } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function Groups() {
  const { t } = useT(); const b = useBooks(); const mode = useHash();
  const [f, setF] = useState({ name: '', parent_id: '', nature: 'asset' }); const [ed, setEd] = useState(null); const [nm, setNm] = useState(''); const [err, setErr] = useState('');
  const byId = Object.fromEntries(b.groups.map(g => [g.id, g]));
  const roots = b.groups.filter(g => !g.parent_id).sort((a, c) => a.name.localeCompare(c.name));
  const list = roots.flatMap(g => [g, ...b.groups.filter(x => x.parent_id === g.id).sort((a, c) => a.name.localeCompare(c.name))]);
  const msg = e => setErr(e.message.includes('Default') ? t('locked') : e.message.includes('foreign') ? t('inUse') : e.message);
  async function create(e) {
    e.preventDefault(); setErr(''); const par = byId[f.parent_id];
    const { error } = await supabase.from('account_groups').insert({ name: f.name.trim(), parent_id: f.parent_id || null, nature: par ? par.nature : f.nature });
    if (error) return msg(error); setF({ name: '', parent_id: '', nature: 'asset' }); b.reload();
  }
  async function rename(g) { setErr(''); const { error } = await supabase.from('account_groups').update({ name: nm.trim() }).eq('id', g.id); if (error) return msg(error); setEd(null); b.reload(); }
  async function del(g) { if (!confirm(t('confirmDeleteItem'))) return; setErr(''); const { error } = await supabase.from('account_groups').delete().eq('id', g.id); if (error) return msg(error); b.reload(); }
  const showForm = !mode || mode === 'create', canAlter = !mode || mode === 'alter', canDel = !mode || mode === 'delete';
  return (<Shell title={t('accGroup')} company={b.tenant?.name}>
    {showForm && <form onSubmit={create} className="card" style={{ maxWidth: 460 }}><b>{t('newGroup')}</b>
      <label>{t('ledgerName')}</label><input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <label>{t('under')}</label><select value={f.parent_id} onChange={e => setF({ ...f, parent_id: e.target.value })}><option value="">{t('primary')}</option>{b.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      {!f.parent_id && <><label>{t('nature')}</label><select value={f.nature} onChange={e => setF({ ...f, nature: e.target.value })}>{['asset', 'liability', 'income', 'expense'].map(n => <option key={n}>{n}</option>)}</select></>}
      <button className="full gold">{t('save')}</button></form>}
    {err && <div className="err">{err}</div>}
    <table className="tt" style={{ marginTop: 8 }}><thead><tr><th>{t('accGroup')}</th><th>{t('under')}</th><th>{t('nature')}</th><th /><th /></tr></thead>
      <tbody>{list.map(g => <tr key={g.id}>
        <td style={{ paddingLeft: g.parent_id ? 28 : 8 }}>{ed === g.id ? <input value={nm} onChange={e => setNm(e.target.value)} /> : g.parent_id ? g.name : <b>{g.name}</b>}</td>
        <td>{byId[g.parent_id]?.name || t('primary')}</td><td>{g.nature}</td><td className="muted">{g.is_default ? t('defaultGroup') : t('ownGroup')}</td>
        <td style={{ whiteSpace: 'nowrap' }}>{!g.is_default && <>
          {ed === g.id ? <button className="gold" onClick={() => rename(g)}>{t('save')}</button> : canAlter && <button className="ghost" onClick={() => { setEd(g.id); setNm(g.name); }}>{t('alter')}</button>}{' '}
          {canDel && <button className="ghost" style={{ color: 'var(--bad)' }} onClick={() => del(g)}>{t('delete')}</button>}</>}</td></tr>)}</tbody></table>
  </Shell>);
}
