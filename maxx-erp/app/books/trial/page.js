'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money, r3 } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function Trial() {
  const { t } = useT(); const b = useBooks(); const [upto, setUpto] = useState(''); const [rows, setRows] = useState([]);
  useEffect(() => { if (b.ready) supabase.rpc('trial_balance', { upto: upto || null }).then(({ data }) => setRows(data || [])); }, [b.ready, upto]);
  const net = rows.map(r => { const d = +r.dr - +r.cr; return { ...r, d: d > 0 ? d : 0, c: d < 0 ? -d : 0, fine: r3(+r.fine_dr - +r.fine_cr) }; }).filter(r => r.d || r.c || r.fine);
  const TD = net.reduce((s, r) => s + r.d, 0), TC = net.reduce((s, r) => s + r.c, 0);
  return (<Shell title={t('trialBalance')} company={b.tenant?.name}>
    <label>{t('upto')}</label><input type="date" value={upto} onChange={e => setUpto(e.target.value)} style={{ maxWidth: 200 }} />
    <table className="tt" style={{ marginTop: 12 }}><thead><tr><th>{t('particulars')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th></tr></thead>
      <tbody>{net.map(r => <tr key={r.ledger_id}><td>{r.name}{r.fine !== 0 && <span className="muted"> ({r.fine} g {t('fine')})</span>}</td>
        <td className="num">{r.d ? money(r.d) : ''}</td><td className="num">{r.c ? money(r.c) : ''}</td></tr>)}
        <tr className="tot"><td>{t('grandTotal')}</td><td className="num">{money(TD)}</td><td className="num">{money(TC)}</td></tr></tbody></table></Shell>);
}
