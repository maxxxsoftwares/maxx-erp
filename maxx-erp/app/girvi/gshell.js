'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../lib/i18n';
export default function GShell({ title, company = '', children }) {
  const r = useRouter(); const { t } = useT();
  useEffect(() => { const h = e => { if (e.key === 'Escape') r.back(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  return (<div className="tbg">
    <div className="tl">
      <div className="twin"><div className="thead">{title}</div><div className="tbody">{children}</div></div>
      <div className="tside">
        <button onClick={() => r.push('/girvi/new')}><b>+</b>{t('newLoan')}</button>
        <button onClick={() => r.push('/girvi')}><b>L</b>{t('allLoans')}</button>
        <button onClick={() => r.push('/girvi/report')}><b>R</b>{t('reports')}</button>
        <button onClick={() => r.push('/dashboard')}><b>H</b>{t('home')}</button>
        <button onClick={() => r.back()}><b>Esc</b>{t('quit')}</button>
      </div></div></div>);
}