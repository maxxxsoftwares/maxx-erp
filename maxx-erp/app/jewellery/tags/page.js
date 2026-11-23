'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useTenant, money, r3 } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import JShell from '../jshell';
export default function Tags() {
  const { t } = useT(); const r = useRouter(); const tn = useTenant();
  const [tags, setTags] = useState([]); const [q, setQ] = useState(''); const [st, setSt] = useState('in_stock'); const [mt, setMt] = useState(''); const [sel, setSel] = useState(new Set());
  const load = () => supabase.from('tags').select('*,item_categories(name)').order('created_at', { ascending: false }).limit(1000).then(({ data }) => setTags(data || []));
  useEffect(() => { if (tn.ready) load(); }, [tn.ready]);
  const shown = tags.filter(x => (!st || x.status === st) && (!mt || x.metal === mt) && (!q || (x.tag_no + (x.huid || '') + (x.description || '') + (x.item_categories?.name || '')).toLowerCase().includes(q.toLowerCase())));
  const tog = id => { const s = new Set(sel); s.has(id) ? s.delete(id) : s.add(id); setSel(s); };
  const setStatus = async (id, status) => { await supabase.from('tags').update({ status }).eq('id', id); load(); };
  const del = async id => { if (!confirm(t('confirmDelete'))) return; await supabase.from('tags').delete().eq('id', id); load(); };
  const print = () => { sessionStorage.setItem('printTags', JSON.stringify([...sel])); r.push('/jewellery/print'); };
  return (<JShell title={t('tags')} company={tn.tenant?.name}>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input style={{ flex: 1, minWidth: 160 }} placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} />
      <select style={{ width: 140 }} value={st} onChange={e => setSt(e.target.value)}><option value="">{t('all')}</option>{['in_stock', 'with_karigar', 'sold'].map(s => <option key={s} value={s}>{t(s)}</option>)}</select>
      <select style={{ width: 120 }} value={mt} onChange={e => setMt(e.target.value)}><option value="">{t('all')}</option>{['gold', 'silver', 'other'].map(s => <option key={s} value={s}>{t(s)}</option>)}</select>
      <button className="gold" disabled={!sel.size} onClick={print}>{t('printSelected')} ({sel.size})</button></div>
    <table className="tt" style={{ marginTop: 10 }}><thead><tr>
      <th><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={shown.length > 0 && shown.every(x => sel.has(x.id))} onChange={e => setSel(e.target.checked ? new Set(shown.map(x => x.id)) : new Set())} /></th>
      <th>{t('tagNo')}</th><th>{t('itemDesc')}</th><th className="num">{t('grossWt')}</th><th className="num">{t('netWt')}</th><th className="num">{t('purity')}</th><th>{t('making')}</th><th>{t('status')}</th><th /></tr></thead>
      <tbody>{!shown.length && <tr><td colSpan={9} className="muted">{t('noEntries')}</td></tr>}
        {shown.map(x => <tr key={x.id}>
          <td><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={sel.has(x.id)} onChange={() => tog(x.id)} /></td>
          <td><b>{x.tag_no}</b>{x.huid && <div className="muted">{x.huid}</div>}</td>
          <td>{x.item_categories?.name} {x.description}<div className="muted">{t(x.metal)} · {x.store}</div></td>
          <td className="num">{x.gross_wt}</td><td className="num">{x.net_wt}</td><td className="num">{x.purity}</td>
          <td>{x.making_value > 0 ? `${money(x.making_value)} ${x.making_type === 'percent' ? '%' : x.making_type === 'per_gram' ? '/g' : ''}` : ''}</td>
          <td><select style={{ width: 120 }} value={x.status} onChange={e => setStatus(x.id, e.target.value)}>{['in_stock', 'with_karigar', 'sold'].map(s => <option key={s} value={s}>{t(s)}</option>)}</select></td>
          <td>{x.status === 'in_stock' && <button className="ghost" onClick={() => del(x.id)}>×</button>}</td></tr>)}
        <tr className="tot"><td colSpan={3}>{t('total')}: {shown.length}</td><td className="num">{r3(shown.reduce((s, x) => s + +x.gross_wt, 0))}</td><td className="num">{r3(shown.reduce((s, x) => s + +x.net_wt, 0))}</td><td colSpan={4} /></tr></tbody></table>
  </JShell>);
}
