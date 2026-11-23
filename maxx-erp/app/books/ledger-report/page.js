'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
const fmt = v => money(Math.abs(v)) + (v >= 0 ? ' Dr' : ' Cr');
export default function LedgerReport() {
  const { t } = useT(); const b = useBooks();
  const [id, setId] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [ls, setLs] = useState([]);
  useEffect(() => {
    if (!id) return setLs([]);
    supabase.from('voucher_lines').select('dr,cr,vouchers!inner(vdate,vtype,vno,narration)').eq('ledger_id', id).limit(5000).then(({ data }) => setLs(data || []));
  }, [id]);
  const led = b.ledgers.find(l => l.id === id);
  const all = [...ls].sort((a, c) => a.vouchers.vdate.localeCompare(c.vouchers.vdate) || a.vouchers.vno - c.vouchers.vno);
  let run = led ? (led.opening_type === 'Dr' ? +led.opening : -led.opening) : 0;
  all.filter(x => from && x.vouchers.vdate < from).forEach(x => { run += +x.dr - +x.cr; });
  const opening = run;
  const rows = all.filter(x => (!from || x.vouchers.vdate >= from) && (!to || x.vouchers.vdate <= to)).map(x => { run += +x.dr - +x.cr; return { ...x, run }; });
  const TD = rows.reduce((s, x) => s + +x.dr, 0), TC = rows.reduce((s, x) => s + +x.cr, 0);
  return (<Shell title={t('ledgerReport')} company={b.tenant?.name}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 200 }}><label>{t('ledgerName')}</label><select value={id} onChange={e => setId(e.target.value)}><option value="" />{b.ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
      <div><label>{t('from')}</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div><label>{t('to')}</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div></div>
    {led && <table className="tt" style={{ marginTop: 12 }}><thead><tr><th>{t('date')}</th><th>{t('particulars')}</th><th>#</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th><th className="num">{t('balance')}</th></tr></thead>
      <tbody><tr className="tot"><td colSpan={5}>{t('opening')}</td><td className="num">{fmt(opening)}</td></tr>
        {rows.map((x, i) => <tr key={i}><td>{x.vouchers.vdate}</td><td>{t(x.vouchers.vtype)}{x.vouchers.narration ? ' · ' + x.vouchers.narration : ''}</td><td>{x.vouchers.vno}</td>
          <td className="num">{+x.dr ? money(x.dr) : ''}</td><td className="num">{+x.cr ? money(x.cr) : ''}</td><td className="num">{fmt(x.run)}</td></tr>)}
        <tr className="tot"><td colSpan={3}>{t('total')}</td><td className="num">{money(TD)}</td><td className="num">{money(TC)}</td><td className="num">{fmt(run)}</td></tr></tbody></table>}
  </Shell>);
}
