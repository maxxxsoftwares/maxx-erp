'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useTenant, money, today } from '../../../lib/acc';
import { calc } from '../../../lib/girvi';
import { useT } from '../../../lib/i18n';
import GShell from '../gshell';
export default function Loan() {
  const { id } = useParams(); const { t } = useT(); const tn = useTenant(); const [l, setL] = useState(null);
  const [f, setF] = useState({ date: today(), kind: 'interest', amount: '', note: '' }); const [err, setErr] = useState('');
  const load = () => supabase.from('loans').select('*,loan_items(*),loan_payments(*)').eq('id', id).single().then(({ data }) => setL(data));
  useEffect(() => { if (tn.ready) load(); }, [tn.ready]);
  if (!l) return <GShell title={t('loading')}><p>{t('loading')}</p></GShell>;
  const active = l.status === 'active', asOn = active ? today() : (l.released_on || today());
  const c = calc(l, l.loan_payments, asOn), overdue = active && today() > c.dueDate;
  const pay = async e => {
    e.preventDefault(); setErr('');
    const { error } = await supabase.from('loan_payments').insert({ loan_id: l.id, pay_date: f.date, kind: f.kind, amount: +f.amount, note: f.note });
    if (error) return setErr(error.message); setF({ ...f, amount: '', note: '' }); load();
  };
  const release = async () => {
    if (!confirm(t('confirmRelease'))) return;
    const rows = []; if (c.interest > 0) rows.push({ loan_id: l.id, pay_date: today(), kind: 'interest', amount: c.interest, note: 'Release' });
    if (c.principal > 0) rows.push({ loan_id: l.id, pay_date: today(), kind: 'principal', amount: c.principal, note: 'Release' });
    if (rows.length) { const { error } = await supabase.from('loan_payments').insert(rows); if (error) return setErr(error.message); }
    await supabase.from('loans').update({ status: 'released', released_on: today() }).eq('id', l.id); load();
  };
  const auction = async () => { if (!confirm(t('confirmAuction'))) return; await supabase.from('loans').update({ status: 'auctioned', released_on: today() }).eq('id', l.id); load(); };
  const msg = t('reminderMsg').replace('{no}', l.loan_no).replace('{amt}', money(c.total));
  const R = (k, v) => <tr><td>{k}</td><td className="num">{v}</td></tr>;
  return (<GShell title={`${t('loanNo')} ${l.loan_no}`} company={tn.tenant?.name}>
    <h2 style={{ marginBottom: 0 }}>{l.customer_name} <span className="muted">{l.mobile}</span></h2>
    <p className="muted">{l.address} · {t(l.status)}{overdue && <b style={{ color: 'var(--bad)' }}> · {t('overdue')}</b>}</p>
    <table className="tt"><tbody>
      {R(t('loanDate'), l.loan_date)}{R(t('dueOn'), c.dueDate)}{R(t('principal'), money(l.principal))}
      {R(t('rateMonth'), `${l.rate_pct}% (${t(l.interest_type)})`)}{R(t('months'), c.months)}
      {R(t('principalPaid'), money(c.paidP))}{R(t('interestPaid'), money(c.paidI))}
      {R(t('outstanding'), money(c.principal))}{R(t('interestDue'), money(c.interest))}
      <tr className="tot"><td>{t('totalDue')}</td><td className="num">{money(c.total)}</td></tr></tbody></table>
    <h3>{t('pledged')}</h3>
    <table className="tt"><tbody>{l.loan_items.map(x => <tr key={x.id}><td>{x.description}</td><td>{t(x.metal)}</td><td className="num">{x.gross_wt || ''} / {x.net_wt || ''} g</td><td className="num">{x.purity ? x.purity + '%' : ''}</td><td className="num">{x.est_value ? money(x.est_value) : ''}</td></tr>)}</tbody></table>
    {active && <form onSubmit={pay} className="card" style={{ marginTop: 12 }}><b>{t('addPayment')}</b>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <div><label>{t('date')}</label><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></div>
        <div><label>{t('kind')}</label><select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="interest">{t('payInterest')}</option><option value="principal">{t('payPrincipal')}</option></select></div>
        <div><label>{t('amount')}</label><input required inputMode="decimal" style={{ width: 130 }} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></div>
        <button className="gold">{t('save')}</button></div>{err && <div className="err">{err}</div>}</form>}
    <h3>{t('payments')}</h3>
    <table className="tt"><tbody>{!l.loan_payments.length && <tr><td className="muted">{t('noEntries')}</td></tr>}
      {[...l.loan_payments].sort((a, b) => b.pay_date.localeCompare(a.pay_date)).map(p => <tr key={p.id}><td>{p.pay_date}</td><td>{p.kind === 'interest' ? t('payInterest') : t('payPrincipal')}</td><td>{p.note}</td><td className="num">{money(p.amount)}</td></tr>)}</tbody></table>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
      <a href={'/girvi/' + l.id + '/receipt'}><button className="ghost" style={{ color: 'var(--pine)' }}>{t('printReceipt')}</button></a>
      {active && <button className="gold" onClick={release}>{t('release')}</button>}
      {active && <button className="ghost" style={{ color: 'var(--bad)' }} onClick={auction}>{t('markAuction')}</button>}
      {active && l.mobile && <a href={`https://wa.me/91${l.mobile}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><button className="ghost" style={{ color: 'var(--pine)' }}>{t('reminder')}</button></a>}</div>
  </GShell>);
}
