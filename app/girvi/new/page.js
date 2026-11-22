'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useTenant, today } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import GShell from '../gshell';
const item = () => ({ description: '', metal: 'gold', gross_wt: '', net_wt: '', purity: '', est_value: '' });
export default function NewLoan() {
  const { t } = useT(); const r = useRouter(); const tn = useTenant();
  const [f, setF] = useState({ customer_name: '', mobile: '', address: '', loan_date: today(), principal: '', rate_pct: '2', interest_type: 'simple', tenure_months: '12', notes: '' });
  const [items, setItems] = useState([item()]); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const up = (i, k, v) => setItems(items.map((x, j) => j === i ? { ...x, [k]: v } : x));
  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('create_loan', { p: { ...f, principal: +f.principal, rate_pct: +f.rate_pct, tenure_months: +f.tenure_months, items: items.filter(x => x.description.trim()) } });
    setBusy(false); if (error) return setErr(error.message); r.push('/girvi/' + data);
  }
  return (<GShell title={t('newLoan')} company={tn.tenant?.name}>
    <form onSubmit={save}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0 12px' }}>
        <div><label>{t('customer')}</label><input required value={f.customer_name} onChange={set('customer_name')} /></div>
        <div><label>{t('mobile')}</label><input inputMode="numeric" maxLength={10} value={f.mobile} onChange={set('mobile')} /></div>
        <div><label>{t('loanDate')}</label><input type="date" required value={f.loan_date} onChange={set('loan_date')} /></div>
        <div><label>{t('principal')}</label><input required inputMode="decimal" value={f.principal} onChange={set('principal')} /></div>
        <div><label>{t('rateMonth')}</label><input required inputMode="decimal" value={f.rate_pct} onChange={set('rate_pct')} /></div>
        <div><label>{t('interestType')}</label><select value={f.interest_type} onChange={set('interest_type')}><option value="simple">{t('simple')}</option><option value="compound">{t('compound')}</option></select></div>
        <div><label>{t('tenure')}</label><input inputMode="numeric" value={f.tenure_months} onChange={set('tenure_months')} /></div>
        <div><label>{t('address')}</label><input value={f.address} onChange={set('address')} /></div></div>
      <h3 style={{ marginBottom: 0 }}>{t('pledged')}</h3>
      <table className="tt"><thead><tr><th>{t('itemDesc')}</th><th>{t('metalType')}</th><th>{t('grossWt')}</th><th>{t('netWt')}</th><th>{t('purity')} %</th><th>{t('estValue')}</th><th /></tr></thead>
        <tbody>{items.map((x, i) => <tr key={i}>
          <td><input value={x.description} onChange={e => up(i, 'description', e.target.value)} /></td>
          <td><select value={x.metal} onChange={e => up(i, 'metal', e.target.value)}><option value="gold">{t('gold')}</option><option value="silver">{t('silver')}</option><option value="other">{t('other')}</option></select></td>
          {['gross_wt', 'net_wt', 'purity', 'est_value'].map(k => <td key={k}><input style={{ width: 80 }} inputMode="decimal" value={x[k]} onChange={e => up(i, k, e.target.value)} /></td>)}
          <td>{items.length > 1 && <button type="button" className="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>}</td></tr>)}</tbody></table>
      <button type="button" className="ghost" style={{ marginTop: 8 }} onClick={() => setItems([...items, item()])}>+ {t('addRow')}</button>
      {err && <div className="err">{err}</div>}
      <button className="full gold" disabled={busy}>{t('save')}</button>
    </form></GShell>);
}
