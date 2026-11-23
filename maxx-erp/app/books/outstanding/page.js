'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money, n2, today } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
const age = d => d === '1900-01-01' ? 9999 : Math.round((new Date(today()) - new Date(d)) / 864e5);
const bucket = a => a <= 30 ? 0 : a <= 60 ? 1 : a <= 90 ? 2 : 3;
export default function Outstanding() {
  const { t } = useT(); const b = useBooks(); const [side, setSide] = useState('receivable'); const [ls, setLs] = useState([]);
  const grp = side === 'receivable' ? 'Sundry Debtors' : 'Sundry Creditors';
  const leds = b.ledgers.filter(l => l.account_groups?.name === grp);
  useEffect(() => { if (!b.ready || !leds.length) return setLs([]);
    supabase.from('voucher_lines').select('ledger_id,dr,cr,vouchers!inner(vdate)').in('ledger_id', leds.map(l => l.id)).limit(20000).then(({ data }) => setLs(data || [])); }, [b.ready, side]);
  // FIFO ageing: the balance is matched against the newest bills (debit entries for receivables, credit entries for payables).
  const rows = leds.map(l => {
    const mine = ls.filter(x => x.ledger_id === l.id), recv = side === 'receivable', sg = recv ? 1 : -1;
    const bal = n2(sg * ((l.opening_type === 'Dr' ? +l.opening : -l.opening) + mine.reduce((s, x) => s + +x.dr - +x.cr, 0)));
    const ev = mine.map(x => ({ d: x.vouchers.vdate, a: +(recv ? x.dr : x.cr) })).filter(x => x.a > 0);
    if (+l.opening > 0 && (l.opening_type === 'Dr') === recv) ev.push({ d: '1900-01-01', a: +l.opening });
    ev.sort((a, c) => c.d.localeCompare(a.d));
    const bk = [0, 0, 0, 0]; let rem = bal;
    for (const e of ev) { if (rem <= 0) break; const take = Math.min(rem, e.a); bk[bucket(age(e.d))] += take; rem -= take; }
    if (rem > 0) bk[3] += rem;
    return { name: l.name, bal, bk };
  }).filter(x => x.bal !== 0);
  const tot = i => rows.reduce((s, x) => s + (i < 4 ? x.bk[i] : x.bal), 0);
  return (<Shell title={t('outstanding2')} company={b.tenant?.name}>
    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>{['receivable', 'payable'].map(k => <button key={k} className={side === k ? 'gold' : 'ghost'} style={{ color: side === k ? undefined : 'var(--pine)' }} onClick={() => setSide(k)}>{t(k)}</button>)}</div>
    <table className="tt"><thead><tr><th>{t('particulars')}</th><th className="num">0–30</th><th className="num">31–60</th><th className="num">61–90</th><th className="num">90+</th><th className="num">{t('total')}</th></tr></thead>
      <tbody>{!rows.length && <tr><td colSpan={6} className="muted">{t('noEntries')}</td></tr>}
        {rows.map(x => <tr key={x.name}><td>{x.name}</td>{x.bk.map((v, i) => <td key={i} className="num">{v ? money(v) : ''}</td>)}<td className="num"><b>{money(x.bal)}</b></td></tr>)}
        <tr className="tot"><td>{t('grandTotal')}</td>{[0, 1, 2, 3, 4].map(i => <td key={i} className="num">{money(tot(i))}</td>)}</tr></tbody></table>
    <p className="muted">{t('ageNote')}</p></Shell>);
}
