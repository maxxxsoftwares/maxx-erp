'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useTenant, money } from '../../../../lib/acc';
import { calc } from '../../../../lib/girvi';
import { useT } from '../../../../lib/i18n';
import GShell from '../../gshell';
export default function Receipt() {
  const { id } = useParams(); const { t } = useT(); const tn = useTenant(); const [l, setL] = useState(null);
  useEffect(() => { if (tn.ready) supabase.from('loans').select('*,loan_items(*)').eq('id', id).single().then(({ data }) => setL(data)); }, [tn.ready]);
  if (!l) return <GShell title={t('loading')}><p>{t('loading')}</p></GShell>;
  const due = calc(l, [], l.loan_date).dueDate;
  return (<GShell title={t('receipt')} company={tn.tenant?.name}>
    <button className="gold noprint" onClick={() => window.print()}>{t('print')}</button>
    <div className="slip">
      <h2 style={{ textAlign: 'center', margin: '8px 0 0' }}>{tn.tenant?.name}</h2>
      <p style={{ textAlign: 'center', margin: 0 }}><b>{t('girvi')} — {t('receipt')}</b></p>
      <table className="tt" style={{ marginTop: 10 }}><tbody>
        <tr><td>{t('loanNo')}</td><td><b>{l.loan_no}</b></td><td>{t('date')}</td><td>{l.loan_date}</td></tr>
        <tr><td>{t('customer')}</td><td>{l.customer_name}</td><td>{t('mobile')}</td><td>{l.mobile}</td></tr>
        <tr><td>{t('address')}</td><td colSpan={3}>{l.address}</td></tr>
        <tr><td>{t('principal')}</td><td><b>{money(l.principal)}</b></td><td>{t('rateMonth')}</td><td>{l.rate_pct}% ({t(l.interest_type)})</td></tr>
        <tr><td>{t('tenure')}</td><td>{l.tenure_months}</td><td>{t('dueOn')}</td><td>{due}</td></tr></tbody></table>
      <table className="tt" style={{ marginTop: 10 }}><thead><tr><th>{t('itemDesc')}</th><th>{t('metalType')}</th><th>{t('grossWt')}</th><th>{t('netWt')}</th><th>{t('purity')} %</th><th>{t('estValue')}</th></tr></thead>
        <tbody>{l.loan_items.map(x => <tr key={x.id}><td>{x.description}</td><td>{t(x.metal)}</td><td>{x.gross_wt}</td><td>{x.net_wt}</td><td>{x.purity}</td><td className="num">{x.est_value ? money(x.est_value) : ''}</td></tr>)}</tbody></table>
      <p className="muted" style={{ marginTop: 10 }}>{t('terms')}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50 }}><span>{t('signCustomer')}</span><span>{t('signShop')}</span></div>
    </div></GShell>);
}
