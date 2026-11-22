'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../lib/i18n';
export default function Shell({ title, company = '', children }) {
  const r = useRouter(); const { t, toggle } = useT();
  useEffect(() => {
    const go = { F4: 'contra', F5: 'payment', F6: 'receipt', F7: 'journal', F8: 'sales', F9: 'purchase' };
    const h = e => {
      if (e.key === 'Escape') r.back();
      if (go[e.key]) { e.preventDefault(); r.push('/books/voucher/' + go[e.key]); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  return (<div className="tbg">
    <div className="ttop"><b>{t('app')}</b><span>{company}</span><button className="ghost" onClick={toggle}>{t('lang')}</button></div>
    <div className="tl">
      <div className="twin"><div className="thead">{title}</div><div className="tbody">{children}</div></div>
      <div className="tside">
        <button onClick={() => r.push('/books/voucher/contra')}><b>F4</b>{t('contra')}</button>
        <button onClick={() => r.push('/books/voucher/payment')}><b>F5</b>{t('payment')}</button>
        <button onClick={() => r.push('/books/voucher/receipt')}><b>F6</b>{t('receipt')}</button>
        <button onClick={() => r.push('/books/voucher/journal')}><b>F7</b>{t('journal')}</button>
        <button onClick={() => r.push('/books/voucher/sales')}><b>F8</b>{t('sales')}</button>
        <button onClick={() => r.push('/books/voucher/purchase')}><b>F9</b>{t('purchase')}</button>
        <button onClick={() => r.push('/books')}><b>G</b>{t('gateway')}</button>
        <button onClick={() => r.back()}><b>Esc</b>{t('quit')}</button>
      </div>
    </div></div>);
}
