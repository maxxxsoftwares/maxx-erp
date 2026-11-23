'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useBooks } from '../../../../lib/acc';
import { useT } from '../../../../lib/i18n';
import Shell from '../../shell';
import Form from '../../voucher-form';
export default function Edit() {
  const { id } = useParams(); const b = useBooks(); const { t } = useT(); const [v, setV] = useState(null);
  useEffect(() => { if (b.ready) supabase.from('vouchers').select('id,vtype,vno,vdate,narration,voucher_lines(ledger_id,dr,cr,gross_wt,purity,rate)').eq('id', id).single().then(({ data }) => setV(data)); }, [b.ready]);
  if (!b.ready || !v) return <Shell title={t('loading')}><p>{t('loading')}</p></Shell>;
  const rows = v.voucher_lines.map(l => ({ mode: 'ledger', ledger: l.ledger_id, side: +l.dr > 0 ? 'Dr' : 'Cr', amount: String(+l.dr > 0 ? l.dr : l.cr),
    gross: l.gross_wt ?? '', purity: l.purity ?? '', rate: l.rate ?? '' }));
  return <Form b={b} type={v.vtype} initial={{ id: v.id, date: v.vdate, narr: v.narration || '', rows }} />;
}
