'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money, n2, today } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
const NAMES = ['Sales', 'Output CGST', 'Output SGST', 'Output IGST', 'Purchase', 'Input CGST', 'Input SGST', 'Input IGST'];
export default function Gst() {
  const { t } = useT(); const b = useBooks(); const [from, setFrom] = useState(today().slice(0, 8) + '01'); const [to, setTo] = useState(today()); const [ls, setLs] = useState([]);
  useEffect(() => { if (b.ready) supabase.from('voucher_lines').select('dr,cr,ledgers!inner(name),vouchers!inner(vdate)').in('ledgers.name', NAMES).gte('vouchers.vdate', from).lte('vouchers.vdate', to).limit(20000).then(({ data }) => setLs(data || [])); }, [b.ready, from, to]);
  const v = (n, sg) => n2(ls.filter(x => x.ledgers.name === n).reduce((s, x) => s + sg * (+x.cr - +x.dr), 0));
  const out = ['CGST', 'SGST', 'IGST'].map(k => v('Output ' + k, 1)), inp = ['CGST', 'SGST', 'IGST'].map(k => v('Input ' + k, -1));
  const sum = a => n2(a.reduce((s, x) => s + x, 0));
  const R = (k, val) => <tr><td>{k}</td><td className="num">{money(val)}</td></tr>;
  return (<Shell title={t('gstReport')} company={b.tenant?.name}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}><div><label>{t('from')}</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div><label>{t('to')}</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div></div>
    <table className="tt" style={{ marginTop: 12, maxWidth: 520 }}><tbody>
      {R(t('taxableSales'), v('Sales', 1))}{R('Output CGST', out[0])}{R('Output SGST', out[1])}{R('Output IGST', out[2])}
      {R(t('taxablePurchase'), v('Purchase', -1))}{R('Input CGST', inp[0])}{R('Input SGST', inp[1])}{R('Input IGST', inp[2])}
      <tr className="tot"><td>{t('netGst')}</td><td className="num">{money(sum(out) - sum(inp))}</td></tr></tbody></table>
    <p className="muted">{t('gstNote')}</p></Shell>);
}
