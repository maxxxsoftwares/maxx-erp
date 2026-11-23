'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant, r3 } from '../../lib/acc';
import { useT } from '../../lib/i18n';
import JShell from './jshell';
export default function Home() {
  const { t } = useT(); const tn = useTenant(); const [tags, setTags] = useState([]);
  useEffect(() => { if (tn.ready) supabase.from('tags').select('status,metal,gross_wt,net_wt').limit(10000).then(({ data }) => setTags(data || [])); }, [tn.ready]);
  const stat = (m, s) => { const x = tags.filter(g => g.metal === m && g.status === s); return `${x.length} · ${r3(x.reduce((a, g) => a + +g.net_wt, 0))} g`; };
  return (<JShell title={t('jewellery')} company={tn.tenant?.name}>
    <h3 style={{ marginTop: 0 }}>{t('stockSummary')} ({t('netWt')})</h3>
    <table className="tt"><thead><tr><th /><th>{t('in_stock')}</th><th>{t('with_karigar')}</th><th>{t('sold')}</th></tr></thead>
      <tbody>{['gold', 'silver', 'other'].map(m => <tr key={m}><td><b>{t(m)}</b></td><td>{stat(m, 'in_stock')}</td><td>{stat(m, 'with_karigar')}</td><td>{stat(m, 'sold')}</td></tr>)}</tbody></table>
  </JShell>);
}
