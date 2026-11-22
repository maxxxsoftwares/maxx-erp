'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useTenant, money, today } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import GShell from '../gshell';
export default function Report() {
  const { t } = useT(); const tn = useTenant();
  const [from, setFrom] = useState(today().slice(0, 8) + '01'); const [to, setTo] = useState(today());
  const [loans, setLoans] = useState([]); const [pays, setPays] = useState([]);
  useEffect(() => { if (!tn.ready) return;
    supabase.from('loans').select('loan_no,loan_date,principal,customer_name').gte('loan_date', from).lte('loan_date', to).then(({ data }) => setLoans(data || []));
    supabase.from('loan_payments').select('pay_date,kind,amount,loans(loan_no,customer_name)').gte('pay_date', from).lte('pay_date', to).order('pay_date').then(({ data }) => setPays(data || []));
  }, [tn.ready, from, to]);
  const sum = (a, f) => a.filter(f).reduce((s, x) => s + +(x.amount ?? x.principal), 0);
  return (<GShell title={t('reports')} company={tn.tenant?.name}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <div><label>{t('from')}</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div><label>{t('to')}</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div></div>
    <div className="grid" style={{ margin: '12px 0' }}>
      <div className="tile">{t('given')}<br />{loans.length} · {money(sum(loans, () => true))}</div>
      <div className="tile">{t('interestCollected')}<br />{money(sum(pays, p => p.kind === 'interest'))}</div>
      <div className="tile">{t('principalCollected')}<br />{money(sum(pays, p => p.kind === 'principal'))}</div></div>
    <table className="tt"><thead><tr><th>{t('date')}</th><th>#</th><th>{t('customer')}</th><th>{t('kind')}</th><th className="num">{t('amount')}</th></tr></thead>
      <tbody>{!pays.length && <tr><td colSpan={5} className="muted">{t('noEntries')}</td></tr>}
        {pays.map((p, i) => <tr key={i}><td>{p.pay_date}</td><td>{p.loans?.loan_no}</td><td>{p.loans?.customer_name}</td><td>{p.kind === 'interest' ? t('payInterest') : t('payPrincipal')}</td><td className="num">{money(p.amount)}</td></tr>)}</tbody></table>
  </GShell>);
}
