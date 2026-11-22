'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useBooks, today } from '../../../../lib/acc';
import { useT } from '../../../../lib/i18n';
import Shell from '../../shell';
import Form from '../../voucher-form';
export default function Edit() {
  const { id } = useParams(); const r = useRouter(); const b = useBooks(); const { t } = useT(); const [v, setV] = useState(null); const [nb, setNb] = useState({});
  useEffect(() => { if (!b.ready) return; setV(null);
    supabase.from('vouchers').select('id,vtype,vno,fy,vdate,narration,voucher_lines(ledger_id,dr,cr,gross_wt,purity,rate)').eq('id', id).single().then(({ data }) => setV(data)); }, [b.ready, id]);
  // Page Up / Page Down: previous / next voucher of the same type and year
  useEffect(() => { if (!v) return;
    supabase.from('vouchers').select('id,vno').eq('vtype', v.vtype).eq('fy', v.fy).in('vno', [v.vno - 1, v.vno + 1])
      .then(({ data }) => setNb({ prev: data?.find(x => x.vno === v.vno - 1)?.id, next: data?.find(x => x.vno === v.vno + 1)?.id })); }, [v]);
  useEffect(() => {
    const mk = k => e => { if (nb[k]) { r.push('/books/edit/' + nb[k]); e.detail.handled = true; } };
    const p = mk('prev'), n = mk('next');
    window.addEventListener('maxx:prev', p); window.addEventListener('maxx:next', n);
    return () => { window.removeEventListener('maxx:prev', p); window.removeEventListener('maxx:next', n); };
  }, [nb]);
  if (!b.ready || !v) return <Shell title={t('loading')}><p>{t('loading')}</p></Shell>;
  const dup = window.location.hash === '#dup';   // Alt+2 from Day Book: open as a new voucher
  const rows = v.voucher_lines.map(l => ({ mode: 'ledger', ledger: l.ledger_id, side: +l.dr > 0 ? 'Dr' : 'Cr', amount: String(+l.dr > 0 ? l.dr : l.cr),
    gross: l.gross_wt ?? '', purity: l.purity ?? '', rate: l.rate ?? '' }));
  return <Form key={id + dup} b={b} type={v.vtype} initial={dup ? { date: today(), narr: v.narration || '', rows } : { id: v.id, date: v.vdate, narr: v.narration || '', rows }} />;
}
