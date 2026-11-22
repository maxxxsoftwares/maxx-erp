'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useTenant, money } from '../../../lib/acc';
import { balances } from '../../../lib/karigar';
import { useT } from '../../../lib/i18n';
import JShell from '../jshell';
const blank = { name: '', mobile: '', address: '', wastage_pct: '', labour_type: 'per_gram', labour_rate: '' };
export default function Karigars() {
  const { t } = useT(); const r = useRouter(); const tn = useTenant();
  const [ks, setKs] = useState([]); const [tx, setTx] = useState([]); const [f, setF] = useState(blank); const [err, setErr] = useState('');
  const load = async () => {
    setKs((await supabase.from('karigars').select('*').order('name')).data || []);
    setTx((await supabase.from('karigar_txns').select('karigar_id,kind,metal,fine_wt,wastage_fine,labour_amount,cash_amount').limit(20000)).data || []);
  };
  useEffect(() => { if (tn.ready) load(); }, [tn.ready]);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function add(e) {
    e.preventDefault(); setErr('');
    const { error } = await supabase.from('karigars').insert({ ...f, name: f.name.trim(), wastage_pct: +f.wastage_pct || 0, labour_rate: +f.labour_rate || 0 });
    if (error) return setErr(error.message); setF(blank); load();
  }
  const rows = ks.map(k => ({ ...k, b: balances(tx.filter(x => x.karigar_id === k.id)) }));
  const tot = m => rows.reduce((s, k) => s + k.b[m], 0);
  return (<JShell title={t('karigar')} company={tn.tenant?.name}>
    <div className="grid" style={{ marginBottom: 12 }}>
      <div className="tile">{t('gold')} · {t('fineHeld')}<br />{tot('gold').toFixed(3)} g</div>
      <div className="tile">{t('silver')} · {t('fineHeld')}<br />{tot('silver').toFixed(3)} g</div>
      <div className="tile">{t('cashPayable')}<br />{money(tot('cash'))}</div></div>
    <table className="tt"><thead><tr><th>{t('karigar')}</th><th className="num">{t('gold')} (g)</th><th className="num">{t('silver')} (g)</th><th className="num">{t('cashPayable')}</th></tr></thead>
      <tbody>{!rows.length && <tr><td colSpan={4} className="muted">{t('noEntries')}</td></tr>}
        {rows.map(k => <tr key={k.id} style={{ cursor: 'pointer' }} onClick={() => r.push('/jewellery/karigar/' + k.id)}>
          <td><b>{k.name}</b><div className="muted">{k.mobile}</div></td><td className="num">{k.b.gold.toFixed(3)}</td><td className="num">{k.b.silver.toFixed(3)}</td><td className="num">{money(k.b.cash)}</td></tr>)}</tbody></table>
    <form onSubmit={add} className="card" style={{ marginTop: 14 }}><b>{t('addKarigar')}</b>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0 12px' }}>
        <div><label>{t('ledgerName')}</label><input required value={f.name} onChange={set('name')} /></div>
        <div><label>{t('mobile')}</label><input inputMode="numeric" maxLength={10} value={f.mobile} onChange={set('mobile')} /></div>
        <div><label>{t('address')}</label><input value={f.address} onChange={set('address')} /></div>
        <div><label>{t('wastagePct')}</label><input inputMode="decimal" value={f.wastage_pct} onChange={set('wastage_pct')} /></div>
        <div><label>{t('labourType')}</label><select value={f.labour_type} onChange={set('labour_type')}><option value="per_gram">{t('perGram')}</option><option value="fixed">{t('perPiece')}</option></select></div>
        <div><label>{t('labourRate')}</label><input inputMode="decimal" value={f.labour_rate} onChange={set('labour_rate')} /></div></div>
      {err && <div className="err">{err}</div>}<button className="full gold">{t('save')}</button></form>
  </JShell>);
}
