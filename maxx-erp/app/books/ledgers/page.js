'use client';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks, useHash, money } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';
import Shell from '../shell';

const blank = { name: '', group_id: '', opening: '', opening_type: 'Dr', gstin: '', mobile: '', is_customer: false, customer_password: '' };

export default function Ledgers() {
  const { t } = useT(); const b = useBooks(); const mode = useHash();
  const [f, setF] = useState(blank); const [ed, setEd] = useState(null); const [err, setErr] = useState('');
  const set = k => e => {
    if (k === 'is_customer') {
      setF({ ...f, [k]: e.target.checked });
    } else {
      setF({ ...f, [k]: e.target.value });
    }
  };

  const locked = l => l.metal || ['Cash', 'Profit & Loss A/c'].includes(l.name);

  async function save(e) {
    e.preventDefault(); setErr('');
    const row = {
      name: f.name.trim(),
      group_id: f.group_id,
      opening: +f.opening || 0,
      opening_type: f.opening_type,
      gstin: f.gstin || null,
      mobile: f.mobile || null,
      is_customer: f.is_customer,
      customer_password: f.is_customer ? (f.customer_password || null) : null
    };
    const { error } = ed ? await supabase.from('ledgers').update(row).eq('id', ed) : await supabase.from('ledgers').insert(row);
    if (error) {
      if (error.message.includes('unique') && error.message.includes('mobile')) {
        return setErr(t('mobileUnique'));
      }
      return setErr(error.message);
    }
    setF(blank); setEd(null); b.reload();
  }

  const alter = l => {
    setEd(l.id);
    setF({
      name: l.name,
      group_id: l.group_id,
      opening: +l.opening > 0 ? String(l.opening) : '',
      opening_type: l.opening_type,
      gstin: l.gstin || '',
      mobile: l.mobile || '',
      is_customer: l.is_customer || false,
      customer_password: l.customer_password || ''
    });
    window.scrollTo(0, 0);
  };

  async function del(l) {
    if (!confirm(t('confirmDeleteItem'))) return; setErr('');
    const { error } = await supabase.from('ledgers').delete().eq('id', l.id);
    if (error) return setErr(error.message.includes('foreign') ? t('inUse') : error.message); b.reload();
  }

  const showForm = !mode || mode === 'create' || ed, canAlter = !mode || mode === 'alter', canDel = !mode || mode === 'delete';

  return (<Shell title={t('ledgers')} company={b.tenant?.name}>
    {showForm && <form onSubmit={save} style={{ maxWidth: 500 }}>
      <label>{t('ledgerName')}</label><input required value={f.name} onChange={set('name')} />
      <label>GSTIN</label><input maxLength={15} value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value.toUpperCase() })} />
      <label>{t('group')}</label><select required value={f.group_id} onChange={set('group_id')}><option value="" />{b.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
      <label>{t('opening')}</label>
      <div style={{ display: 'flex', gap: 8 }}><input inputMode="decimal" value={f.opening} onChange={set('opening')} />
        <select style={{ width: 90 }} value={f.opening_type} onChange={set('opening_type')}><option>Dr</option><option>Cr</option></select></div>
      <label>{t('mobile')}</label><input inputMode="numeric" maxLength={10} value={f.mobile} onChange={set('mobile')} placeholder="10 digit mobile" />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={f.is_customer} onChange={set('is_customer')} />
        <span>{t('customerPortal')} - {t('firstLogin')}: {t('setPassword')}</span>
      </label>
      {f.is_customer && (
        <label style={{ marginTop: 8 }}>{t('setPassword')}</label>
      )}
      {f.is_customer && <input type="password" value={f.customer_password} onChange={set('customer_password')} placeholder={t('setPassword')} />}
      <button className="full gold">{ed ? t('alter') : t('save')}</button>
      {ed && <button type="button" className="full ghost" style={{ color: 'var(--pine)' }} onClick={() => { setEd(null); setF(blank); }}>{t('quit')}</button>}
    </form>}
    {err && <div className="err">{err}</div>}
    <table className="tt" style={{ marginTop: 20 }}><thead><tr><th>{t('ledgerName')}</th><th>{t('group')}</th><th>{t('mobile')}</th><th className="num">{t('opening')}</th><th /></tr></thead>
      <tbody>{b.ledgers.map(l => <tr key={l.id}><td>{l.name}</td><td>{l.account_groups?.name}</td><td>{l.mobile || ''}</td><td className="num">{+l.opening > 0 ? money(l.opening) + ' ' + l.opening_type : ''}</td>
        <td style={{ whiteSpace: 'nowrap' }}>{locked(l) ? <span className="muted">{t('locked')}</span> : <>
          {canAlter && <button className="ghost" onClick={() => alter(l)}>{t('alter')}</button>}{' '}
          {canDel && <button className="ghost" style={{ color: 'var(--bad)' }} onClick={() => del(l)}>{t('delete')}</button>}</>}</td></tr>)}</tbody></table>
  </Shell>);
}