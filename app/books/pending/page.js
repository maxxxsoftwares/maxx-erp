'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, money, canPost } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function Pending() {
  const { t } = useT(); const b = useBooks(); const [rows, setRows] = useState([]); const [err, setErr] = useState('');
  const load = () => supabase.from('vouchers').select('id,vtype,vdate,narration,created_by,voucher_lines(dr,cr,ledgers(name))').eq('status', 'draft').order('vdate').then(({ data }) => setRows(data || []));
  useEffect(() => { if (b.ready) load(); }, [b.ready]);
  const mayPost = canPost(b.role);
  const approve = async id => { setErr(''); const { error } = await supabase.rpc('approve_voucher', { id }); if (error) setErr(error.message); else load(); };
  const reject = async id => { const reason = prompt(t('rejectReason')) || null; setErr(''); const { error } = await supabase.rpc('reject_voucher', { id, reason }); if (error) setErr(error.message); else load(); };
  return (<Shell title={t('pendingApprovals')} company={b.tenant?.name}>
    {err && <div className="err">{err}</div>}
    {!rows.length && <p className="muted">{t('noDrafts')}</p>}
    {rows.map(v => { const ls = v.voucher_lines || []; return (<div className="card" key={v.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <b>{t(v.vtype)} · {v.vdate}</b><b>{money(ls.reduce((s, l) => s + +l.dr, 0))}</b></div>
      {ls.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{l.dr > 0 ? 'Dr' : 'Cr'} {l.ledgers?.name}</span><span>{money(l.dr > 0 ? l.dr : l.cr)}</span></div>)}
      {v.narration && <p className="muted">{v.narration}</p>}
      {mayPost && <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button className="gold" onClick={() => approve(v.id)}>{t('approve')}</button><button className="ghost" style={{ color: 'var(--bad)' }} onClick={() => reject(v.id)}>{t('reject')}</button></div>}
    </div>); })}
  </Shell>);
}
