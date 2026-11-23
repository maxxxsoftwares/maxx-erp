'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money, n2, today } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
function Side({ title, items, total }) {
  return (<table className="tt"><thead><tr><th>{title}</th><th className="num" /></tr></thead><tbody>
    {items.map((x, i) => <tr key={i}><td>{x.name}</td><td className="num">{money(x.amt)}</td></tr>)}
    <tr className="tot"><td>Total</td><td className="num">{money(total)}</td></tr></tbody></table>);
}
export default function Financials() {
  const { t } = useT(); const b = useBooks(); const [upto, setUpto] = useState(''); const [rows, setRows] = useState([]); const [val, setVal] = useState(null);
  const [vf, setVf] = useState({ amount: '', note: '', gr: '', sr: '' }); const [msg, setMsg] = useState('');
  const load = () => {
    supabase.rpc('trial_balance', { upto: upto || null }).then(({ data }) => setRows(data || []));
    supabase.from('stock_valuation').select('*').lte('as_on', upto || today()).order('as_on', { ascending: false }).order('created_at', { ascending: false }).limit(1).then(({ data }) => setVal(data?.[0] || null));
  };
  useEffect(() => { if (b.ready) load(); }, [b.ready, upto]);
  async function fromTags() {
    const { data } = await supabase.from('tags').select('metal,net_wt,purity').eq('status', 'in_stock').limit(10000);
    const fine = m => (data || []).filter(x => x.metal === m).reduce((s, x) => s + +x.net_wt * (+x.purity || 0) / 100, 0);
    setVf({ ...vf, amount: String(n2(fine('gold') / 10 * (+vf.gr || 0) + fine('silver') / 1000 * (+vf.sr || 0))) });
  }
  async function saveVal(e) { e.preventDefault(); const { error } = await supabase.from('stock_valuation').insert({ as_on: upto || today(), amount: +vf.amount, note: vf.note }); setMsg(error ? error.message : t('saved')); load(); }
  const nat = Object.fromEntries(b.groups.map(g => [g.name, g.nature]));
  const mk = (n, sg) => rows.filter(r => nat[r.grp] === n).map(r => ({ name: r.name, grp: r.grp, amt: sg * (+r.dr - +r.cr) })).filter(x => x.amt !== 0);
  const sum = a => n2(a.reduce((s, x) => s + x.amt, 0));
  // With a valuation: it replaces the Stock-in-hand ledgers; the difference from book value flows into profit.
  const hasVal = val != null, bookStock = sum(mk('asset', 1).filter(x => x.grp === 'Stock-in-hand')), adj = hasVal ? n2(+val.amount - bookStock) : 0;
  const ast = mk('asset', 1).filter(x => !hasVal || x.grp !== 'Stock-in-hand'); if (hasVal) ast.push({ name: t('closingStock'), amt: +val.amount });
  const inc = mk('income', -1), exp = mk('expense', 1), lia = mk('liability', -1);
  if (adj > 0) inc.push({ name: t('stockAdj'), amt: adj }); if (adj < 0) exp.push({ name: t('stockAdj'), amt: -adj });
  const np = n2(sum(inc) - sum(exp));
  const expSide = np >= 0 ? [...exp, { name: t('netProfit'), amt: np }] : exp, incSide = np < 0 ? [...inc, { name: t('netLoss'), amt: -np }] : inc;
  const liaSide = [...lia, { name: t('netProfit') + ' / ' + t('netLoss'), amt: np }];
  const G = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 };
  const trade = b.tenant?.gold_trade || b.tenant?.silver_trade;
  return (<Shell title={t('financials')} company={b.tenant?.name}>
    <label>{t('upto')}</label><input type="date" value={upto} onChange={e => setUpto(e.target.value)} style={{ maxWidth: 200 }} />
    <form onSubmit={saveVal} className="card" style={{ marginTop: 12, padding: 10 }}><b>{t('closingStock')}</b> {hasVal && <span className="muted">({val.as_on}: {money(val.amount)})</span>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <div><label>{t('amount')}</label><input required inputMode="decimal" style={{ width: 140 }} value={vf.amount} onChange={e => setVf({ ...vf, amount: e.target.value })} /></div>
        {trade && <><div><label>{t('goldRate')}</label><input inputMode="decimal" style={{ width: 110 }} value={vf.gr} onChange={e => setVf({ ...vf, gr: e.target.value })} /></div>
          <div><label>{t('silverRate')}</label><input inputMode="decimal" style={{ width: 110 }} value={vf.sr} onChange={e => setVf({ ...vf, sr: e.target.value })} /></div>
          <button type="button" className="ghost" style={{ color: 'var(--pine)' }} onClick={fromTags}>{t('calcFromTags')}</button></>}
        <button className="gold">{t('save')}</button></div>{msg && <div className="ok">{msg}</div>}</form>
    <h3>{t('profitLoss')}</h3>
    <div style={G}><Side title={t('expenses')} items={expSide} total={sum(expSide)} /><Side title={t('income')} items={incSide} total={sum(incSide)} /></div>
    <h3>{t('balanceSheet')}</h3>
    <div style={G}><Side title={t('liabilities')} items={liaSide} total={sum(liaSide)} /><Side title={t('assets')} items={ast} total={sum(ast)} /></div>
    <p className="muted">{hasVal ? t('valNote') : t('stockNote')}</p></Shell>);
}
