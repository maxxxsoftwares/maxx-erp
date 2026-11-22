'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { supabase } from '../../../lib/supabase';
import { useTenant } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import JShell from '../jshell';
function Label({ tag, shop }) {
  const q = useRef(), b = useRef();
  useEffect(() => {
    QRCode.toDataURL(tag.tag_no, { margin: 0, width: 160 }).then(u => { if (q.current) q.current.src = u; });
    try { JsBarcode(b.current, tag.tag_no, { height: 18, displayValue: false, margin: 0, width: 1.3 }); } catch (e) {}
  }, []);
  return (<div className="lbl"><img ref={q} alt="" style={{ width: '22mm', height: '22mm' }} />
    <div style={{ minWidth: 0 }}><b>{shop}</b><div><b style={{ fontSize: 12 }}>{tag.tag_no}</b> {tag.item_categories?.name}</div>
      <div>G {tag.gross_wt}g · N {tag.net_wt}g · {tag.purity || ''}%</div>{tag.huid && <div>HUID {tag.huid}</div>}
      <svg ref={b} style={{ maxWidth: '100%' }} /></div></div>);
}
export default function Print() {
  const { t } = useT(); const tn = useTenant(); const [tags, setTags] = useState(null);
  useEffect(() => { if (!tn.ready) return; const ids = JSON.parse(sessionStorage.getItem('printTags') || '[]');
    if (!ids.length) return setTags([]);
    supabase.from('tags').select('*,item_categories(name)').in('id', ids).order('tag_no').then(({ data }) => setTags(data || [])); }, [tn.ready]);
  return (<JShell title={t('printTags')} company={tn.tenant?.name}>
    <button className="gold noprint" onClick={() => window.print()}>{t('print')}</button>
    {tags && !tags.length && <p className="muted">{t('noTags')}</p>}
    <div className="lblwrap" style={{ marginTop: 12 }}>{(tags || []).map(x => <Label key={x.id} tag={x} shop={tn.tenant?.name} />)}</div>
  </JShell>);
}
