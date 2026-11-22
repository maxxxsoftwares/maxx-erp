'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useBooks, money } from '../../../../lib/acc';
import { useT } from '../../../../lib/i18n';
import Shell from '../../shell';
export default function PrintVoucher() {
  const { id } = useParams(); const { t } = useT(); const b = useBooks(); const [v, setV] = useState(null); const [co, setCo] = useState(null);
  useEffect(() => { if (!b.ready) return;
    supabase.from('vouchers').select('*,voucher_lines(dr,cr,metal,gross_wt,purity,fine_wt,rate,ledgers(name,gstin))').eq('id', id).single().then(({ data }) => setV(data));
    supabase.from('company_profile').select('*').maybeSingle().then(({ data }) => setCo(data)); }, [b.ready]);
  if (!v) return <Shell title={t('loading')}><p>{t('loading')}</p></Shell>;
  const ls = v.voucher_lines, tot = ls.reduce((s, l) => s + +l.dr, 0);
  const party = v.vtype === 'sales' ? ls.find(l => +l.dr > 0) : v.vtype === 'purchase' ? ls.find(l => +l.cr > 0) : null;
  const title = v.vtype === 'sales' ? t('taxInvoice') : v.vtype === 'purchase' ? t('purchase') : t(v.vtype);
  return (<Shell title={title} company={b.tenant?.name}>
    <button className="gold noprint" onClick={() => window.print()}>{t('print')}</button>
    <div className="slip"><h2 style={{ textAlign: 'center', margin: '8px 0 0' }}>{b.tenant.name}</h2>
      <p style={{ textAlign: 'center', margin: 0 }}>{co?.address} {co?.phone && '· ' + co.phone}<br />{co?.gstin && <b>GSTIN: {co.gstin}</b>}</p>
      <p style={{ textAlign: 'center' }}><b>{title}</b></p>
      <table className="tt"><tbody><tr><td>{t('voucherNo')}</td><td><b>{v.vno}</b> ({v.fy})</td><td>{t('date')}</td><td>{v.vdate}</td></tr>
        {party && <tr><td>{t('account')}</td><td colSpan={3}><b>{party.ledgers.name}</b> {party.ledgers.gstin && 'GSTIN: ' + party.ledgers.gstin}</td></tr>}</tbody></table>
      <table className="tt" style={{ marginTop: 10 }}><thead><tr><th>{t('particulars')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th></tr></thead>
        <tbody>{ls.map((l, i) => <tr key={i}><td>{l.ledgers.name}{l.metal && <span className="muted"> {l.gross_wt}g × {l.purity}% = {l.fine_wt}g fine @ {l.rate}</span>}</td>
          <td className="num">{+l.dr ? money(l.dr) : ''}</td><td className="num">{+l.cr ? money(l.cr) : ''}</td></tr>)}
          <tr className="tot"><td>{t('total')}</td><td className="num">{money(tot)}</td><td className="num">{money(tot)}</td></tr></tbody></table>
      {v.narration && <p className="muted">{v.narration}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 50 }}><span>{t('signCustomer')}</span><span>{t('signShop')}</span></div></div></Shell>);
}
