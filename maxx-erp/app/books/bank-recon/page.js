'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money, n2 } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function BankRecon() {
  const { t } = useT(); const b = useBooks(); const [id, setId] = useState(''); const [ls, setLs] = useState([]); const [stmt, setStmt] = useState('');
  const banks = b.ledgers.filter(l => l.account_groups?.name === 'Bank Accounts');
  useEffect(() => { if (!id) return setLs([]); supabase.from('voucher_lines').select('id,dr,cr,bank_date,vouchers!inner(vdate,vtype,vno,narration)').eq('ledger_id', id).limit(5000).then(({ data }) => setLs(data || [])); }, [id]);
  const led = b.ledgers.find(l => l.id === id);
  const rows = [...ls].sort((a, c) => a.vouchers.vdate.localeCompare(c.vouchers.vdate) || a.vouchers.vno - c.vouchers.vno);
  const open = led ? (led.opening_type === 'Dr' ? +led.opening : -led.opening) : 0;
  const book = n2(open + rows.reduce((s, x) => s + +x.dr - +x.cr, 0));
  const unDr = rows.filter(x => !x.bank_date).reduce((s, x) => s + +x.dr, 0), unCr = rows.filter(x => !x.bank_date).reduce((s, x) => s + +x.cr, 0);
  const bankBal = n2(book - unDr + unCr);
  const setDate = async (rid, d) => { setLs(ls.map(x => x.id === rid ? { ...x, bank_date: d || null } : x)); await supabase.from('voucher_lines').update({ bank_date: d || null }).eq('id', rid); };
  return (<Shell title={t('bankRecon')} company={b.tenant?.name}>
    <label>{t('bank')}</label><select value={id} onChange={e => setId(e.target.value)} style={{ maxWidth: 320 }}><option value="" />{banks.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
    {led && <>
      <table className="tt" style={{ marginTop: 12, maxWidth: 520 }}><tbody>
        <tr><td>{t('bookBalance')}</td><td className="num">{money(book)}</td></tr>
        <tr><td>{t('unclearedDeposits')} (−)</td><td className="num">{money(unDr)}</td></tr>
        <tr><td>{t('unclearedPayments')} (+)</td><td className="num">{money(unCr)}</td></tr>
        <tr className="tot"><td>{t('bankBalance')}</td><td className="num">{money(bankBal)}</td></tr>
        <tr><td>{t('statementBal')}</td><td><input className="num" inputMode="decimal" value={stmt} onChange={e => setStmt(e.target.value)} /></td></tr>
        {stmt !== '' && <tr className="tot"><td>{t('difference')}</td><td className="num">{money(n2(stmt) - bankBal)}</td></tr>}</tbody></table>
      <table className="tt" style={{ marginTop: 12 }}><thead><tr><th>{t('date')}</th><th>{t('particulars')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th><th>{t('bankDate')}</th></tr></thead>
        <tbody>{rows.map(x => <tr key={x.id} style={{ background: x.bank_date ? '#eef6ea' : undefined }}>
          <td>{x.vouchers.vdate}</td><td>{t(x.vouchers.vtype)} #{x.vouchers.vno} {x.vouchers.narration}</td>
          <td className="num">{+x.dr ? money(x.dr) : ''}</td><td className="num">{+x.cr ? money(x.cr) : ''}</td>
          <td style={{ whiteSpace: 'nowrap' }}><input type="date" style={{ width: 150 }} value={x.bank_date || ''} onChange={e => setDate(x.id, e.target.value)} />
            {!x.bank_date && <button className="ghost" onClick={() => setDate(x.id, x.vouchers.vdate)}>✓</button>}</td></tr>)}</tbody></table></>}
  </Shell>);
}
