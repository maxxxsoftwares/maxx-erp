'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useBooks, money, canPost } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';
export default function DayBook() {
  const { t } = useT(); const b = useBooks(); const r = useRouter();
  const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [rows, setRows] = useState([]); const [open, setOpen] = useState(null); const [all, setAll] = useState(false);
  const load = async () => {
    let q = supabase.from('vouchers').select('id,vtype,vno,fy,vdate,narration,status,created_by,voucher_lines(dr,cr,metal,gross_wt,purity,fine_wt,rate,ledgers(name))')
      .order('vdate', { ascending: false }).order('vno', { ascending: false, nullsFirst: false }).limit(300);
    if (from) q = q.gte('vdate', from); if (to) q = q.lte('vdate', to);
    const { data } = await q; setRows(data || []);
  };
  useEffect(() => { if (b.ready) load(); }, [b.ready, from, to]);
  const mayPost = canPost(b.role);
  const del = async (id, own) => {
    if (!confirm(t('confirmDelete'))) return; setErr('');
    const { error } = own ? await supabase.rpc('delete_own_draft', { id }) : await supabase.rpc('delete_voucher_logged', { id });
    if (error) return setErr(error.message); load();
  };
  const [err, setErr] = useState('');
  const approve = async id => { setErr(''); const { error } = await supabase.rpc('approve_voucher', { id }); if (error) setErr(error.message); else load(); };
  const reject = async id => { const reason = prompt(t('rejectReason')) || null; setErr(''); const { error } = await supabase.rpc('reject_voucher', { id, reason }); if (error) setErr(error.message); else load(); };
  const L = useRef(); L.current = { open, del, r };
  useEffect(() => {
    const on = (n, f) => { const h = e => f(e); window.addEventListener('maxx:' + n, h); return () => window.removeEventListener('maxx:' + n, h); };
    const offs = [
      on('detail', e => { setAll(a => !a); e.detail.handled = true; }),                                                                 // Alt+F1, Shift+Enter
      on('duplicate', e => { if (L.current.open) { L.current.r.push('/books/edit/' + L.current.open + '#dup'); e.detail.handled = true; } }), // Alt+2
      on('deleteItem', e => { if (L.current.open) { L.current.del(L.current.open); e.detail.handled = true; } }),                       // Alt+D
      on('print', e => { if (L.current.open) { L.current.r.push('/books/print/' + L.current.open); e.detail.handled = true; } }),       // Alt+P
    ];
    return () => offs.forEach(f => f());
  }, []);
  return (<Shell title={t('dayBook')} company={b.tenant?.name}>
    {err && <div className="err">{err}</div>}
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <div><label>{t('from')}</label><input data-filter type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div><label>{t('to')}</label><input type="date" value={to} onChange={e => setTo(e.target.value)} /></div></div>
    <table className="tt" style={{ marginTop: 12 }}><thead><tr><th>{t('date')}</th><th>{t('particulars')}</th><th>{t('voucherType')}</th><th>#</th><th className="num">{t('amount')}</th><th /></tr></thead>
      <tbody>{!rows.length && <tr><td colSpan={6} className="muted">{t('noEntries')}</td></tr>}
        {rows.map(v => { const ls = v.voucher_lines || []; return (<>
          <tr key={v.id} onClick={() => setOpen(open === v.id ? null : v.id)} style={{ cursor: 'pointer', opacity: v.status === 'draft' ? .75 : v.status === 'rejected' ? .55 : 1 }}>
            <td>{v.vdate}</td><td>{ls.filter(l => l.dr > 0).map(l => l.ledgers?.name).join(', ')}
              {v.status === 'draft' && <span className="badge" style={{ background: '#fde9c8', color: '#92610c' }}> {t('draftStatus')}</span>}
              {v.status === 'rejected' && <span className="badge" style={{ background: '#f3c9c4', color: '#8f2d24' }}> {t('rejectedStatus')}</span>}</td>
            <td>{t(v.vtype)}</td><td>{v.vno || '—'}<div className="muted">{v.fy || ''}</div></td>
            <td className="num">{money(ls.reduce((s, l) => s + +l.dr, 0))}</td>
            <td style={{ whiteSpace: 'nowrap' }}>
              {v.status === 'draft' && mayPost && <><button className="ghost" onClick={e => { e.stopPropagation(); approve(v.id); }}>{t('approve')}</button> <button className="ghost" style={{ color: 'var(--bad)' }} onClick={e => { e.stopPropagation(); reject(v.id); }}>{t('reject')}</button> </>}
              {v.status === 'posted' && <><button className="ghost" onClick={e => { e.stopPropagation(); r.push('/books/edit/' + v.id); }}>{t('edit')}</button> <button className="ghost" onClick={e => { e.stopPropagation(); r.push('/books/print/' + v.id); }}>{t('print')}</button> </>}
              {v.status === 'posted' && mayPost && <button className="ghost" onClick={e => { e.stopPropagation(); del(v.id, false); }}>{t('delete')}</button>}
              {v.status !== 'posted' && <button className="ghost" onClick={e => { e.stopPropagation(); del(v.id, true); }}>{t('deleteDraft')}</button>}
            </td></tr>
          {(open === v.id || all) && <tr key={v.id + 'd'}><td colSpan={6} style={{ background: '#f1f5fd' }}>
            {ls.map((l, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span>{l.dr > 0 ? 'Dr' : 'Cr'} {l.ledgers?.name}{l.metal ? ` (${l.gross_wt}g × ${l.purity}% = ${l.fine_wt}g fine @ ${l.rate})` : ''}</span><span>{money(l.dr > 0 ? l.dr : l.cr)}</span></div>)}
            {v.narration && <div className="muted">{v.narration}</div>}</td></tr>}</>); })}
      </tbody></table></Shell>);
}
