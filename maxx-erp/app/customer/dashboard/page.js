'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useT, money } from '../../../lib/i18n';
import Link from 'next/link';

export default function CustomerDashboard() {
  const { t, toggle } = useT(); const r = useRouter();
  const [customer, setCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [bills, setBills] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('ledger');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return r.push('/customer/login');

      // Find customer's ledger
      const { data: ledger } = await supabase.from('ledgers').select('*').eq('id', user.id).single();
      if (!ledger) return r.push('/customer/login');
      setCustomer(ledger);

      // Load ledger entries (voucher lines for this ledger)
      const { data: entries } = await supabase
        .from('voucher_lines')
        .select('*, vouchers(vno, vdate, vtype, narration)')
        .eq('ledger_id', ledger.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setLedgerEntries(entries || []);

      // Load bills (sales/purchase vouchers for this party)
      const { data: billData } = await supabase
        .from('vouchers')
        .select('*')
        .in('vtype', ['sales', 'purchase'])
        .eq('tenant_id', ledger.tenant_id)
        .order('vdate', { ascending: false })
        .limit(20);
      setBills(billData || []);

      // Load stock items
      const { data: items } = await supabase
        .from('stock_items')
        .select('*')
        .eq('tenant_id', ledger.tenant_id)
        .eq('is_active', true)
        .order('name');
      setStockItems(items || []);

      // Load orders
      const { data: orderData } = await supabase
        .from('customer_orders')
        .select('*')
        .eq('ledger_id', ledger.id)
        .order('created_at', { ascending: false });
      setOrders(orderData || []);

      // Load chat messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles(name)')
        .eq('ledger_id', ledger.id)
        .order('created_at', { ascending: true });
      setChatMessages(messages || []);

      setLoading(false);
    })();
  }, [r]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !customer) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('chat_messages').insert({
      ledger_id: customer.id,
      sender_id: user.id,
      message: newMessage,
      is_from_customer: true
    });
    setNewMessage('');
  };

  const placeOrder = async (item) => {
    if (!customer) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('customer_orders').insert({
      ledger_id: customer.id,
      tenant_id: customer.tenant_id,
      items: [{ id: item.id, name: item.name, qty: 1, price: item.price }],
      total_amount: item.price,
      status: 'pending'
    });
    alert(t('saved'));
  };

  if (loading) return <div className="wrap">{t('loading')}</div>;
  if (!customer) return <div className="wrap">Loading...</div>;

  const statusColors = {
    pending: '#f59e0b',
    confirmed: '#3b82f6',
    shipped: '#8b5cf6',
    delivered: '#10b981',
    cancelled: '#ef4444'
  };

  return (<div className="frame">
    <div className="fbar">
      <b className="fname">{customer.name}</b>
      <span className="welcome-user" style={{color:'#fff',fontSize:14}}>{t('welcomeUser')}, {customer.name} <span className="role-badge" style={{background:'rgba(255,255,255,0.2)',padding:'2px 8px',borderRadius:12,fontSize:11,marginLeft:8}}>{t('roleCustomer')}</span></span>
    </div>
    <div className="fbody">
      <nav className="drawer open" style={{position:'static',width:'100%',background:'#fff',borderBottom:'1px solid var(--line)',padding:'8px'}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {['ledger', 'bills', 'stock', 'orders', 'chat'].map(tab => (
            <button key={tab} className={activeTab === tab ? 'gold' : 'ghost'} style={{color: activeTab === tab ? undefined : 'var(--pine)'}} onClick={() => setActiveTab(tab)}>{t(tab === 'ledger' ? 'viewLedger' : tab === 'bills' ? 'viewBills' : tab === 'stock' ? 'stockItems' : tab === 'orders' ? 'placeOrder' : 'chatWithAdmin')}</button>
          ))}
        </div>
      </nav>
      <main className="fmain" style={{padding:16}}>
        {activeTab === 'ledger' && (
          <div className="card">
            <h2>{t('viewLedger')}</h2>
            <table className="tt"><thead><tr><th>{t('date')}</th><th>{t('voucherNo')}</th><th>{t('voucherType')}</th><th className="num">{t('debit')}</th><th className="num">{t('credit')}</th><th>{t('wgColumn')}</th><th>{t('narration')}</th></tr></thead>
              <tbody>{ledgerEntries.map(e => (
                <tr key={e.id}>
                  <td>{e.vouchers?.vdate}</td>
                  <td>{e.vouchers?.vno}</td>
                  <td>{e.vouchers?.vtype}</td>
                  <td className="num">{e.dr > 0 ? money(e.dr) : ''}</td>
                  <td className="num">{e.cr > 0 ? money(e.cr) : ''}</td>
                  <td><span style={{background:e.wg === 'G' ? '#f3c9c4' : '#d7ead9',padding:'2px 8px',borderRadius:4,fontSize:12}}>{e.wg || ' '}</span></td>
                  <td>{e.vouchers?.narration}</td>
                </tr>
              ))}</tbody></table>
          </div>
        )}
        {activeTab === 'bills' && (
          <div className="card">
            <h2>{t('viewBills')}</h2>
            <table className="tt"><thead><tr><th>{t('date')}</th><th>{t('voucherNo')}</th><th>{t('voucherType')}</th><th>{t('narration')}</th></tr></thead>
              <tbody>{bills.map(b => (
                <tr key={b.id}>
                  <td>{b.vdate}</td>
                  <td>{b.vno}</td>
                  <td>{b.vtype}</td>
                  <td>{b.narration}</td>
                </tr>
              ))}</tbody></table>
          </div>
        )}
        {activeTab === 'stock' && (
          <div className="card">
            <h2>{t('stockItems')}</h2>
            <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))'}}>
              {stockItems.map(item => (
                <div key={item.id} className="tile" style={{textAlign:'center',padding:'12px',minHeight:200,display:'flex',flexDirection:'column'}}>
                  {item.image_url && <img src={item.image_url} alt={item.name} style={{maxWidth:'100%',height:120,objectFit:'cover',borderRadius:8,marginBottom:8}} />
                  <div style={{fontWeight:600,marginBottom:4}}>{item.name}</div>
                  <div className="muted" style={{marginBottom:8}}>{item.category}</div>
                  <div style={{fontWeight:700,color:'var(--pine)',marginBottom:8}}>₹{money(item.price)}</div>
                  <div className="muted" style={{fontSize:12,marginBottom:8}}>Stock: {item.stock_qty} {item.unit}</div>
                  <button className="full gold" style={{fontSize:12,padding:'6px 12px'}} onClick={() => placeOrder(item)}>{t('placeOrder')}</button>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'orders' && (
          <div className="card">
            <h2>{t('placeOrder')}</h2>
            <table className="tt"><thead><tr><th>{t('date')}</th><th>Items</th><th className="num">{t('amount')}</th><th>{t('orderStatus')}</th></tr></thead>
              <tbody>{orders.map(o => (
                <tr key={o.id}>
                  <td>{o.created_at?.split('T')[0]}</td>
                  <td>{(o.items || []).map(i => i.name).join(', ')}</td>
                  <td className="num">{money(o.total_amount)}</td>
                  <td><span style={{background:statusColors[o.status],color:'#fff',padding:'2px 8px',borderRadius:4,fontSize:12,textTransform:'capitalize'}}>{o.status}</span></td>
                </tr>
              ))}</tbody></table>
          </div>
        )}
        {activeTab === 'chat' && (
          <div className="card" style={{display:'flex',flexDirection:'column',height:'calc(100vh - 200px)'}}>
            <h2>{t('chatWithAdmin')}</h2>
            <div style={{flex:1,overflowY:'auto',marginBottom:16,padding:'8px',border:'1px solid var(--line)',borderRadius:8,background:'#fff'}}>
              {chatMessages.map(m => (
                <div key={m.id} style={{marginBottom:12,padding:'8px 12px',borderRadius:8,background:m.is_from_customer ? '#e8f5e9' : '#f3e5f5',maxWidth:'80%',alignSelf:m.is_from_customer ? 'flex-end' : 'flex-start',marginLeft:m.is_from_customer ? 'auto' : 0}}>
                  <div style={{fontSize:12,color:'#666',marginBottom:2}}>{m.sender?.name || (m.is_from_customer ? 'You' : 'Admin')}</div>
                  <div>{m.message}</div>
                  <div style={{fontSize:11,color:'#999',marginTop:2}}>{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder={t('sendMessage')} style={{flex:1,minHeight:46,padding:'0 12px',border:'1px solid var(--line)',borderRadius:8}} />
              <button className="gold" onClick={sendMessage} disabled={!newMessage.trim()}>{t('sendMessage')}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  </div>);
}