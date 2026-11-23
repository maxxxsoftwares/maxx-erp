'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { money, r3 } from '../../lib/acc';
import { useT } from '../../lib/i18n';
export default function CustomerPortal() {
  const { t, toggle } = useT(); const r = useRouter();
  const [me, setMe] = useState(null); const [tab, setTab] = useState('ledger');
  const [stmt, setStmt] = useState([]); const [tags, setTags] = useState([]); const [cart, setCart] = useState({});
  const [orders, setOrders] = useState([]); const [msgs, setMsgs] = useState([]); const [body, setBody] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const bottom = useRef();

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return r.replace('/customer-login');
    const { data: p } = await supabase.from('profiles').select('name, tenants(name)').eq('id', user.id).maybeSingle();
    if (!p) return r.replace('/customer-login'); setMe(p);
  })(); }, []);
  useEffect(() => { if (!me) return;
    if (tab === 'ledger') supabase.rpc('my_ledger_statement').then(({ data, error }) => { setStmt(data || []); if (error) setErr(error.message); });
    if (tab === 'catalogue') supabase.from('tags').select('id,tag_no,description,metal,net_wt,purity,image_url,item_categories(name)').eq('status', 'in_stock').limit(200).then(({ data }) => setTags(data || []));
    if (tab === 'orders') supabase.from('orders').select('id,status,note,created_at,order_items(description,qty)').order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));
  }, [tab, me]);
  useEffect(() => { if (tab !== 'chat' || !me) return; let on = true;
    const load = () => supabase.from('messages').select('*').order('created_at').then(({ data }) => { if (on) setMsgs(data || []); });
    load(); const t2 = setInterval(load, 4000); return () => { on = false; clearInterval(t2); };
  }, [tab, me]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  const bal = stmt.reduce((s, x) => s + (+x.dr - +x.cr), 0);
  const add = t_ => setCart({ ...cart, [t_.id]: (cart[t_.id] || 0) + 1 });
  const placeOrder = async () => {
    setErr(''); setOk('');
    const items = Object.entries(cart).map(([tag_id, qty]) => ({ tag_id, qty, description: tags.find(x => x.id === tag_id)?.description || '' }));
    if (!items.length) return;
    const { error } = await supabase.rpc('place_order', { items, note: null });
    if (error) return setErr(error.message); setCart({}); setOk(t('orderPlaced')); setTab('orders');
  };
  const send = async e => {
    e.preventDefault(); if (!body.trim()) return;
    const { error } = await supabase.rpc('send_message', { body: body.trim() }); if (!error) { setBody(''); const { data } = await supabase.from('messages').select('*').order('created_at'); setMsgs(data || []); }
  };
  if (!me) return <div className="wrap">{t('loading')}</div>;
  const TAB = (k, label) => <button key={k} className={tab === k ? 'gold' : 'ghost'} style={{ color: tab === k ? undefined : 'var(--pine)' }} onClick={() => setTab(k)}>{label}</button>;
  return (<>
    <div className="bar"><b>{me.tenants?.name}</b>
      <span><button className="ghost" onClick={toggle}>{t('lang')}</button>{' '}
      <button className="ghost" onClick={async () => { await supabase.auth.signOut(); r.push('/customer-login'); }}>{t('signOutBtn')}</button></span></div>
    <div className="wrap">
      <h1 style={{ marginBottom: 4 }}>{t('custWelcome')}, {me.name}</h1>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
        {TAB('ledger', t('myLedger'))}{TAB('catalogue', t('catalogue'))}{TAB('orders', t('myOrders'))}{TAB('chat', t('chat'))}</div>
      {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}

      {tab === 'ledger' && <div className="card">
        <p><b>{t('myBalance')}: </b>{money(Math.abs(bal))} {bal >= 0 ? 'Dr' : 'Cr'}</p>
        <table className="tt"><thead><tr><th>{t('date')}</th><th>{t('voucherType')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th><th>{t('wgColumn')}</th></tr></thead>
          <tbody>{!stmt.length && <tr><td colSpan={5} className="muted">{t('noEntries')}</td></tr>}
            {stmt.map((x, i) => <tr key={i}><td>{x.vdate}</td><td>{t(x.vtype)} #{x.vno}</td><td className="num">{+x.dr ? money(x.dr) : ''}</td><td className="num">{+x.cr ? money(x.cr) : ''}</td><td><span className={x.wg === 'G' ? 'wg-gray' : 'wg-white'}>{x.wg === 'G' ? 'G' : ' '}</span></td></tr>)}</tbody></table>
      </div>}

      {tab === 'catalogue' && <>
        {!tags.length && <p className="muted">{t('noItems')}</p>}
        <div className="grid">{tags.map(x => <div className="tile" key={x.id} style={{ textAlign: 'left' }}>
          {x.image_url ? <img src={x.image_url} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 6 }} /> : <div style={{ height: 90, borderRadius: 8, marginBottom: 6, background: 'linear-gradient(135deg,#dfe6f7,#c7d4f5)', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 700, color: 'var(--pine)' }}>{(x.item_categories?.name || x.metal)[0]}</div>}
          <b>{x.item_categories?.name} {x.description}</b><div className="muted">{x.net_wt} g · {x.purity}%</div>
          <button className="gold" style={{ marginTop: 6, width: '100%' }} onClick={() => add(x)}>{cart[x.id] ? `${t('inCart')}: ${cart[x.id]}` : t('addToOrder')}</button></div>)}</div>
        {Object.keys(cart).length > 0 && <button className="full gold" style={{ marginTop: 14 }} onClick={placeOrder}>{t('placeOrder')} ({Object.values(cart).reduce((a, b) => a + b, 0)})</button>}
      </>}

      {tab === 'orders' && <>{!orders.length && <p className="muted">{t('noEntries')}</p>}
        {orders.map(o => <div className="card" key={o.id}><b>{o.status}</b> · {new Date(o.created_at).toLocaleDateString()}
          {o.order_items.map((it, i) => <div key={i} className="muted">{it.qty} × {it.description}</div>)}</div>)}</>}

      {tab === 'chat' && <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {!msgs.length && <p className="muted">{t('noMessages')}</p>}
          {msgs.map(m => <div key={m.id} style={{ alignSelf: m.sender_role === 'customer' ? 'flex-end' : 'flex-start', background: m.sender_role === 'customer' ? 'var(--pine)' : '#eef1fb', color: m.sender_role === 'customer' ? '#fff' : 'inherit', borderRadius: 10, padding: '6px 10px', maxWidth: '75%' }}>{m.body}</div>)}
          <div ref={bottom} /></div>
        <form onSubmit={send} style={{ display: 'flex', gap: 8, marginTop: 8 }}><input style={{ flex: 1 }} placeholder={t('typeMessage')} value={body} onChange={e => setBody(e.target.value)} /><button className="gold">{t('sendMessage')}</button></form>
      </div>}
    </div></>);
}
