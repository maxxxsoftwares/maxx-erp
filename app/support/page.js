'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useT } from '../../lib/i18n';
export default function Support() {
  const { t } = useT(); const [list, setList] = useState([]); const [sel, setSel] = useState(null); const [msgs, setMsgs] = useState([]); const [body, setBody] = useState(''); const bottom = useRef();
  const loadList = () => supabase.from('messages').select('customer_id, body, created_at, sender_role').order('created_at', { ascending: false }).then(({ data }) => {
    const seen = new Set(), out = [];
    (data || []).forEach(m => { if (!seen.has(m.customer_id)) { seen.add(m.customer_id); out.push(m); } });
    setList(out);
  });
  useEffect(() => { loadList(); const i = setInterval(loadList, 5000); return () => clearInterval(i); }, []);
  useEffect(() => { if (!sel) return; let on = true;
    const load = () => supabase.from('messages').select('*').eq('customer_id', sel).order('created_at').then(({ data }) => { if (on) setMsgs(data || []); });
    load(); const i = setInterval(load, 4000); return () => { on = false; clearInterval(i); };
  }, [sel]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs]);
  const [names, setNames] = useState({});
  useEffect(() => { const ids = [...new Set(list.map(x => x.customer_id))].filter(id => !names[id]); if (!ids.length) return;
    supabase.from('profiles').select('id,name').in('id', ids).then(({ data }) => setNames(n => ({ ...n, ...Object.fromEntries((data || []).map(x => [x.id, x.name])) }))); }, [list]);
  const send = async e => {
    e.preventDefault(); if (!body.trim() || !sel) return;
    const { error } = await supabase.rpc('send_staff_message', { to_customer: sel, body: body.trim() });
    if (!error) { setBody(''); const { data } = await supabase.from('messages').select('*').eq('customer_id', sel).order('created_at'); setMsgs(data || []); }
  };
  return (<div className="wrap" style={{ maxWidth: 900 }}>
    <h1>{t('customerChat')}</h1>
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 14 }}>
      <div className="card" style={{ padding: 8 }}>
        {!list.length && <p className="muted" style={{ padding: 8 }}>{t('noCustomers')}</p>}
        {list.map(x => <div key={x.customer_id} onClick={() => setSel(x.customer_id)} style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: sel === x.customer_id ? '#eef1fb' : 'transparent' }}>
          <b>{names[x.customer_id] || '…'}</b><div className="muted" style={{ fontSize: 12 }}>{x.body.slice(0, 30)}</div></div>)}
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
        {!sel ? <p className="muted">{t('selectCustomer')}</p> : <>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {msgs.map(m => <div key={m.id} style={{ alignSelf: m.sender_role === 'staff' ? 'flex-end' : 'flex-start', background: m.sender_role === 'staff' ? 'var(--pine)' : '#eef1fb', color: m.sender_role === 'staff' ? '#fff' : 'inherit', borderRadius: 10, padding: '6px 10px', maxWidth: '75%' }}>{m.body}</div>)}
            <div ref={bottom} /></div>
          <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 8 }}><input style={{ flex: 1 }} placeholder={t('typeMessage')} value={body} onChange={e => setBody(e.target.value)} /><button className="gold">{t('sendMessage')}</button></form>
        </>}
      </div>
    </div></div>);
}
