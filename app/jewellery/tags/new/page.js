'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useTenant, r3 } from '../../../../lib/acc';
import { useT } from '../../../../lib/i18n';
import JShell from '../../jshell';
const PUR = { gold: [['24K', 99.9], ['22K', 91.6], ['18K', 75], ['14K', 58.5]], silver: [['Fine', 99.9], ['Sterling', 92.5], ['80', 80]], other: [] };
export default function NewTag() {
  const { t } = useT(); const r = useRouter(); const tn = useTenant(); const [cats, setCats] = useState([]);
  const [f, setF] = useState({ category_id: '', metal: 'gold', description: '', gross_wt: '', stone_wt: '', purity: '91.6', huid: '', making_type: 'per_gram', making_value: '', stone_value: '', qty: '1', store: 'Main' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (tn.ready) supabase.from('item_categories').select('*').order('name').then(({ data }) => setCats(data || [])); }, [tn.ready]);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const net = r3((+f.gross_wt || 0) - (+f.stone_wt || 0)), fine = r3(net * (+f.purity || 0) / 100);
  async function save(e) {
    e.preventDefault(); setErr('');
    if (net <= 0) return setErr(t('badWeight'));
    setBusy(true);
    const { data, error } = await supabase.rpc('create_tags', { p: f });
    setBusy(false); if (error) return setErr(error.message);
    sessionStorage.setItem('printTags', JSON.stringify(data.map(x => x.id))); r.push('/jewellery/print');
  }
  const col = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0 12px' };
  return (<JShell title={t('newTag')} company={tn.tenant?.name}>
    <form onSubmit={save}>
      <div style={col}>
        <div><label>{t('category')}</label><select value={f.category_id} onChange={set('category_id')}><option value="" />{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label>{t('metalType')}</label><select value={f.metal} onChange={e => setF({ ...f, metal: e.target.value, purity: PUR[e.target.value][1]?.[1] ?? '' })}>{['gold', 'silver', 'other'].map(m => <option key={m} value={m}>{t(m)}</option>)}</select></div>
        <div><label>{t('itemDesc')}</label><input value={f.description} onChange={set('description')} /></div></div>
      <div style={col}>
        <div><label>{t('grossWt')} (g)</label><input required inputMode="decimal" value={f.gross_wt} onChange={set('gross_wt')} /></div>
        <div><label>{t('stoneWt')} (g)</label><input inputMode="decimal" value={f.stone_wt} onChange={set('stone_wt')} /></div>
        <div><label>{t('purity')} %</label><input inputMode="decimal" value={f.purity} onChange={set('purity')} /></div></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>{PUR[f.metal].map(([n, v]) => <button type="button" key={n} className="ghost" style={{ color: 'var(--pine)' }} onClick={() => setF({ ...f, purity: String(v) })}>{n} · {v}</button>)}</div>
      <p className="muted">{t('netWt')}: <b>{net}</b> g · {t('fine')}: <b>{fine}</b> g</p>
      <div style={col}>
        <div><label>{t('making')}</label><select value={f.making_type} onChange={set('making_type')}><option value="per_gram">{t('perGram')}</option><option value="fixed">{t('fixed')}</option><option value="percent">{t('percent')}</option></select></div>
        <div><label>{t('making')} {t('amount')}</label><input inputMode="decimal" value={f.making_value} onChange={set('making_value')} /></div>
        <div><label>{t('stoneValue')}</label><input inputMode="decimal" value={f.stone_value} onChange={set('stone_value')} /></div>
        <div><label>HUID</label><input maxLength={6} value={f.huid} onChange={e => setF({ ...f, huid: e.target.value.toUpperCase() })} /></div>
        <div><label>{t('qty')}</label><input inputMode="numeric" value={f.qty} onChange={set('qty')} /></div>
        <div><label>{t('store')}</label><input value={f.store} onChange={set('store')} /></div></div>
      {err && <div className="err">{err}</div>}
      <button className="full gold" disabled={busy}>{t('save')} + {t('printTags')}</button>
    </form></JShell>);
}
