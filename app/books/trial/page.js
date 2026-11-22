'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function Trial() {
  const { t } = useT(); const b = useBooks(); const [upto, setUpto] = useState(''); const [rows, setRows] = useState([]); const [err, setErr] = useState('');
  useEffect(() => { if (b.ready) supabase.rpc('trial_balance', { upto: upto || null }).then(({ data, error }) => { setErr(error ? error.message : ''); setRows(data || []); }); }, [b.ready, upto]);
  const net = rows.map(r => ({ ...r, a: +r.dr - +r.cr, g: +r.g_dr - +r.g_cr, s: +r.s_dr - +r.s_cr })).filter(r => Math.abs(r.a) > 0.004 || Math.abs(r.g) > 0.0004 || Math.abs(r.s) > 0.0004);
  const tot = (k, pos) => net.reduce((x, r) => x + (pos ? Math.max(r[k], 0) : Math.max(-r[k], 0)), 0);
  const cell = (v, pos, d) => (pos ? v > 0.0004 : v < -0.0004) ? (d ? Math.abs(v).toFixed(3) : money(Math.abs(v))) : '';
  const UNITS = [['a', t('amount'), false], ['g', `${t('gold')} ${t('fine')}`, true], ['s', `${t('silver')} ${t('fine')}`, true]];
  const diff = (k, d) => { const x = tot(k, true) - tot(k, false); return Math.abs(x) < 0.0005 ? '✓' : (d ? x.toFixed(3) : money(x)); };
  return (<Shell title={t('trialBalance')} company={b.tenant?.name}>
    <label>{t('upto')}</label><input type="date" value={upto} onChange={e => setUpto(e.target.value)} style={{ maxWidth: 200 }} />
    {err && <div className="err">{err}</div>}
    <div style={{ overflowX: 'auto' }}><table className="tt" style={{ marginTop: 12 }}>
      <thead><tr><th rowSpan={2}>{t('particulars')}</th>{UNITS.map(([k, n]) => <th key={k} colSpan={2} style={{ textAlign: 'center' }}>{n}</th>)}</tr>
        <tr>{UNITS.map(([k]) => [<th key={k + 'd'} className="num">{t('debit')}</th>, <th key={k + 'c'} className="num">{t('credit')}</th>])}</tr></thead>
      <tbody>{net.map(r => <tr key={r.ledger_id}><td>{r.name}</td>{UNITS.map(([k, , d]) => [<td key={k + 'd'} className="num">{cell(r[k], true, d)}</td>, <td key={k + 'c'} className="num">{cell(r[k], false, d)}</td>])}</tr>)}
        <tr className="tot"><td>{t('grandTotal')}</td>{UNITS.map(([k, , d]) => [<td key={k + 'd'} className="num">{d ? tot(k, true).toFixed(3) : money(tot(k, true))}</td>, <td key={k + 'c'} className="num">{d ? tot(k, false).toFixed(3) : money(tot(k, false))}</td>])}</tr>
        <tr><td className="muted">{t('difference')}</td>{UNITS.map(([k, , d]) => <td key={k} colSpan={2} className="num">{diff(k, d)}</td>)}</tr></tbody></table></div>
    <p className="muted">{t('trialNote')}</p>
  </Shell>);
}
