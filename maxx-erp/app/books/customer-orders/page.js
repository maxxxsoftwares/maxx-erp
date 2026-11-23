'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks } from '../../../lib/acc';
import { useT, money } from '../../../lib/i18n';
import Shell from '../shell';

const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const statusColors = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  shipped: '#8b5cf6',
  delivered: '#10b981',
  cancelled: '#ef4444'
};

export default function CustomerOrders() {
  const { t } = useT(); const b = useBooks();
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (b.ready) {
      supabase.from('customer_orders').select('*, ledgers(name,mobile)').order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []));
    }
  }, [b.ready]);

  async function updateStatus(orderId, newStatus) {
    const { error } = await supabase.from('customer_orders').update({ status: newStatus }).eq('id', orderId);
    if (error) return alert(error.message);
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    setMsg(t('saved'));
  }

  return (<Shell title={t('customerOrders')} company={b.tenant?.name}>
    {msg && <div className="ok">{msg}</div>}
    <table className="tt"><thead><tr><th>{t('date')}</th><th>{t('customer')}</th><th>Items</th><th className="num">{t('amount')}</th><th>{t('orderStatus')}</th><th>Action</th></tr></thead>
      <tbody>{orders.map(o => <tr key={o.id}><td>{o.created_at?.split('T')[0]}</td>
        <td>{o.ledgers?.name}<div className="muted" style={{fontSize:12}}>{o.ledgers?.mobile}</div></td>
        <td>{(o.items || []).map(i => `${i.name} x${i.qty}`).join(', ')}</td>
        <td className="num">{money(o.total_amount)}</td>
        <td><span style={{background:statusColors[o.status],color:'#fff',padding:'2px 8px',borderRadius:4,fontSize:12,textTransform:'capitalize'}}>{o.status}</span></td>
        <td style={{whiteSpace:'nowrap'}}>
          {statusOptions.filter(s => s !== o.status).map(s => (
            <button key={s} className="ghost" style={{fontSize:11,padding:'4px 8px',marginRight:4}} onClick={() => updateStatus(o.id, s)}>{s}</button>
          ))}
        </td></tr>)}</tbody></table>
  </Shell>);
}