'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useTenant, money, today, useHash } from '../../lib/acc';
import { calc } from '../../lib/girvi';
import { useT } from '../../lib/i18n';
import GShell from './gshell';
export default function Girvi() {
  const { t } = useT(); const r = useRouter(); const tn = useTenant();
  const [loans, setLoans] = useState([]); const [tab, setTab] = useState('active'); const [q, setQ] = useState('');
  useEffect(() => { if (tn.ready) supabase.from('loans').select('*,loan_payments(pay_date,kind,amount)').order('loan_no', { ascending: false }).then(({ data }) => setLoans(data || [])); }, [tn.ready]);
  const hash = useHash();
  useEffect(() => { if (['active', 'overdue', 'released', 'auctioned', 'all'].includes(hash)) setTab(hash); }, [hash]);
  const rows = loans.map(l => { const a = l.status === 'active'; const c = calc(l, l.loan_payments, a ? today() : (l.released_on || today())); return { ...l, c, overdue: a && today() > c.dueDate }; });
  const act = rows.filter(x => x.status === 'active');
  const shown = rows.filter(x => tab === 'all' || (tab === 'overdue' ? x.overdue : x.status === tab))
    .filter(x => !q || (x.customer_name + x.mobile + x.loan_no).toLowerCase().includes(q.toLowerCase()));
  const sum = k => act.reduce((s, x) => s + x.c[k], 0);
  const badge = x => <span style={{ padding: '2px 8px', fontSize: 13, background: x.overdue ? '#f3c9c4' : x.status === 'active' ? '#d7ead9' : '#e4e0d0' }}>{x.overdue ? t('overdue') : t(x.status)}</span>;
  return (<GShell title={t('girvi')} company={tn.tenant?.name}>
    <div className="grid" style={{ marginBottom: 12 }}>
      <div className="tile">{t('openLoans')}<br />{act.length}</div>
      <div className="tile">{t('outstanding')}<br />{money(sum('principal'))}</div>
      <div className="tile">{t('interestDue')}<br />{money(sum('interest'))}</div></div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
      {['active', 'overdue', 'released', 'auctioned', 'all'].map(k => <button key={k} className={tab === k ? 'gold' : 'ghost'} style={{ color: tab === k ? undefined : 'var(--pine)' }} onClick={() => setTab(k)}>{t(k)}</button>)}</div>
    <input data-filter placeholder={t('search')} value={q} onChange={e => setQ(e.target.value)} />
    <table className="tt" style={{ marginTop: 10 }}><thead><tr><th>#</th><th>{t('customer')}</th><th>{t('loanDate')}</th><th className="num">{t('outstanding')}</th><th className="num">{t('interestDue')}</th><th className="num">{t('totalDue')}</th><th>{t('status')}</th></tr></thead>
      <tbody>{!shown.length && <tr><td colSpan={7} className="muted">{t('noEntries')}</td></tr>}
        {shown.map(x => <tr key={x.id} style={{ cursor: 'pointer' }} onClick={() => r.push('/girvi/' + x.id)}>
          <td>{x.loan_no}</td><td>{x.customer_name}<div className="muted">{x.mobile}</div></td><td>{x.loan_date}</td>
          <td className="num">{money(x.c.principal)}</td><td className="num">{money(x.c.interest)}</td><td className="num">{money(x.c.total)}</td><td>{badge(x)}</td></tr>)}</tbody></table>
  </GShell>);
}
