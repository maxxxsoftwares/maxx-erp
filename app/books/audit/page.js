'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
const COL = { created_draft: '#5a6a84', approved: '#0a7a3d', rejected: '#8f2d24', deleted: '#8f2d24' };
export default function AuditLog() {
  const { t } = useT(); const b = useBooks(); const [rows, setRows] = useState([]); const [err, setErr] = useState('');
  useEffect(() => { if (b.ready) supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(500).then(({ data, error }) => { setRows(data || []); if (error) setErr(error.message); }); }, [b.ready]);
  return (<Shell title={t('auditLog')} company={b.tenant?.name}>
    {err && <div className="err">{err}</div>}
    <table className="tt"><thead><tr><th>{t('date')}</th><th>{t('kind')}</th><th>{t('voucherType')}</th><th>#</th><th>{t('particulars')}</th></tr></thead>
      <tbody>{!rows.length && <tr><td colSpan={5} className="muted">{t('noEntries')}</td></tr>}
        {rows.map(x => <tr key={x.id}><td>{new Date(x.at).toLocaleString()}</td>
          <td style={{ color: COL[x.action] || 'inherit', fontWeight: 600 }}>{x.action.replace('_', ' ')}</td>
          <td>{x.vtype ? t(x.vtype) : ''}</td><td>{x.vno || ''}{x.fy ? ` (${x.fy})` : ''}</td>
          <td>{x.actor_name || ''}{x.details?.narration ? ' · ' + x.details.narration : ''}{x.details?.reason ? ' · ' + x.details.reason : ''}</td></tr>)}</tbody></table>
  </Shell>);
}
