'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooks } from '../../lib/acc';
import { useT } from '../../lib/i18n';
import Shell from './shell';
const ITEMS = [['masters'], ['createLedger', '/books/ledgers'], ['transactions'],
  ['contra', '/books/voucher/contra', 'F4'], ['payment', '/books/voucher/payment', 'F5'], ['receipt', '/books/voucher/receipt', 'F6'], ['journal', '/books/voucher/journal', 'F7'], ['sales', '/books/voucher/sales', 'F8'], ['purchase', '/books/voucher/purchase', 'F9'],
  ['displayReports'], ['dayBook', '/books/daybook'], ['trialBalance', '/books/trial'], ['ledgerReport', '/books/ledger-report'], ['financials', '/books/financials'], ['outstanding2', '/books/outstanding'], ['gstReport', '/books/gst'], ['bankRecon', '/books/bank-recon'], ['company', '/books/company']];
const NAV = ITEMS.filter(i => i[1]);
export default function Gateway() {
  const { t } = useT(); const r = useRouter(); const b = useBooks(); const [sel, setSel] = useState(0);
  useEffect(() => {
    const h = e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % NAV.length); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s + NAV.length - 1) % NAV.length); }
      if (e.key === 'Enter') r.push(NAV[sel][1]);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [sel]);
  return (<Shell title={t('gateway')} company={b.tenant?.name}>
    <div className="tmenu" style={{ maxWidth: 420, margin: '0 auto' }}>
      {ITEMS.map(([k, href, key]) => !href ? <h3 key={k}>{t(k)}</h3> :
        <div key={k} className={NAV[sel][1] === href ? 'sel' : ''} onClick={() => r.push(href)} onMouseEnter={() => setSel(NAV.findIndex(n => n[1] === href))}>
          {t(k)}{key && <span style={{ float: 'right', opacity: .7 }}>{key}</span>}
        </div>)}
    </div></Shell>);
}
