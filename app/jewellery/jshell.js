'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../../lib/i18n';
export default function JShell({ title, company = '', children }) {
  const r = useRouter(); const { t, toggle } = useT();
  useEffect(() => { const h = e => { if (e.key === 'Escape') r.back(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);
  const B = (k, href, label) => <button onClick={() => r.push(href)}><b>{k}</b>{label}</button>;
  return (<div className="tbg">
    <div className="ttop"><b>{t('app')}</b><span>{company}</span><button className="ghost" onClick={toggle}>{t('lang')}</button></div>
    <div className="tl">
      <div className="twin"><div className="thead">{title}</div><div className="tbody">{children}</div></div>
      <div className="tside">
        {B('+', '/jewellery/tags/new', t('newTag'))}{B('T', '/jewellery/tags', t('tags'))}{B('C', '/jewellery/categories', t('categories'))}{B('K', '/jewellery/karigar', t('karigar'))}
        {B('A', '/books', t('m_accounts'))}{B('H', '/dashboard', t('home'))}
        <button onClick={() => r.back()}><b>Esc</b>{t('quit')}</button>
      </div></div></div>);
}
