'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useBooks, useHash } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';

const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
const REG = ['Regular', 'Composite', 'Consumer', 'Unknown'];
const blank = { group_id: '', name: '', alias: '', gstin: '', reg_type: 'Regular', pan: '', address: '', street: '', city: '', pincode: '', state: 'Uttar Pradesh', country: 'India', mobile: '', email: '', credit_days: '',
  cash: '', cash_t: '', gold: '', gold_t: '', silver: '', silver_t: '', bank_holder: '', bank_acno: '', bank_ifsc: '' };
const ORDER = ['under', 'name', 'alias', 'gstin', 'reg', 'pan', 'address', 'street', 'city', 'pincode', 'state', 'country', 'mobile', 'email', 'credit', 'cash', 'gold', 'silver', 'bhold', 'bacno', 'bifsc'];

export default function Ledgers() {
  const { t } = useT(); const r = useRouter(); const b = useBooks(); const h = useHash();
  const mode = ['alter', 'delete'].includes(h) ? h : 'create';
  const [groups, setGroups] = useState([]); const [ledgers, setLedgers] = useState([]); const [f, setF] = useState(blank); const [sel, setSel] = useState(null);
  const [which, setWhich] = useState(null); const [q, setQ] = useState(''); const [idx, setIdx] = useState(0);
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const refs = useRef({}); const act = useRef({});

  const load = async () => {
    const g = await supabase.from('account_groups').select('*').order('name'); setGroups(g.data || []);
    const l = await supabase.from('ledgers').select('*,account_groups(name)').order('name'); setLedgers(l.data || []);
  };
  useEffect(() => { if (b.ready) load(); }, [b.ready]);
  useEffect(() => { setSel(null); setF(blank); setQ(''); setErr(''); setMsg(''); setIdx(0); setWhich(null); setTimeout(() => refs.current[mode === 'create' ? 'under' : 'name']?.focus(), 50); }, [mode]);

  const picking = mode !== 'create' && !sel;
  const locked = !!sel && (sel.sys_role || sel.metal || ['Cash', 'Profit & Loss A/c'].includes(sel.name));
  const gById = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g])), [groups]);
  const items = useMemo(() => (which === 'ledger' ? ledgers : groups).filter(x => !q || x.name.toLowerCase().includes(q.toLowerCase())), [which, ledgers, groups, q]);
  useEffect(() => { document.querySelector('.li.on')?.scrollIntoView({ block: 'nearest' }); }, [idx, items, which]);

  const map = e => /System ledgers/.test(e.message) ? t('locked') : /column|schema cache/.test(e.message) ? t('runSql2') : /mobile_unique/.test(e.message) ? t('mobileExists') : /duplicate/.test(e.message) ? t('nameExists') : /foreign/.test(e.message) ? t('ledgerInUse') : e.message;
  const ref = k => el => { refs.current[k] = el; };
  const next = k => { const n = ORDER[ORDER.indexOf(k) + 1]; n ? refs.current[n]?.focus() : save(); };
  const enter = k => e => { if (e.key === 'Enter') { e.preventDefault(); next(k); } };
  const set = key => e => setF({ ...f, [key]: e.target.value });

  function loadForEdit(l) {
    const amt = (v, ty) => +v > 0 ? [String(v), ty] : ['', ''];
    const [cash, cash_t] = amt(l.opening, l.opening_type), [gold, gold_t] = amt(l.open_gold, l.open_gold_type), [silver, silver_t] = amt(l.open_silver, l.open_silver_type);
    setSel(l); setQ(''); setErr(''); setMsg(''); setWhich(null);
    setF({ group_id: l.group_id, name: l.name, alias: l.alias || '', gstin: l.gstin || '', reg_type: l.reg_type || 'Regular', pan: l.pan || '', address: l.address || '', street: l.street || '', city: l.city || '',
      pincode: l.pincode || '', state: l.state || '', country: l.country || 'India', mobile: l.mobile || '', email: l.email || '', credit_days: l.credit_days ?? '',
      cash, cash_t, gold, gold_t, silver, silver_t, bank_holder: l.bank_holder || '', bank_acno: l.bank_acno || '', bank_ifsc: l.bank_ifsc || '' });
    setTimeout(() => refs.current.alias?.focus(), 30);
  }
  function chooseGroup(g) { setF({ ...f, group_id: g.id }); setWhich(null); setQ(''); setIdx(0); setTimeout(() => refs.current.name?.focus(), 30); }
  const nav = choose => e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!which) { setQ(''); setIdx(0); setWhich(picking ? 'ledger' : 'group'); return; }
      setIdx(i => e.key === 'ArrowDown' ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0));
    } else if (e.key === 'Enter') { e.preventDefault(); if (which && items[idx]) choose(items[idx]); else if (!picking) next(picking ? 'name' : 'under'); }
  };
  const pickLedger = l => mode === 'delete' ? doDelete(l) : loadForEdit(l);

  async function save() {
    setErr(''); setMsg(''); if (picking) return;
    if (!f.group_id) return setErr(t('underRequired'));
    if (!f.name.trim()) return setErr(t('nameRequired'));
    if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(f.gstin)) return setErr(t('badGstin'));
    if (f.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan)) return setErr(t('badPan'));
    if (f.mobile && !/^\d{10}$/.test(f.mobile)) return setErr(t('badMobile'));
    for (const k of ['cash', 'gold', 'silver']) if (+f[k] > 0 && !f[k + '_t']) return setErr(t('chooseDrCr'));
    const dc = v => v === 'Cr' ? 'Cr' : 'Dr', n = v => +v > 0 ? +v : 0, s = v => (v || '').trim() || null;
    const row = { group_id: f.group_id, name: f.name.trim(), alias: s(f.alias), gstin: s(f.gstin), reg_type: f.reg_type, pan: s(f.pan), address: s(f.address), street: s(f.street), city: s(f.city),
      pincode: s(f.pincode), state: s(f.state), country: s(f.country), mobile: s(f.mobile), email: s(f.email), credit_days: f.credit_days === '' ? null : +f.credit_days,
      opening: n(f.cash), opening_type: dc(f.cash_t), open_gold: n(f.gold), open_gold_type: dc(f.gold_t), open_silver: n(f.silver), open_silver_type: dc(f.silver_t),
      bank_holder: s(f.bank_holder), bank_acno: s(f.bank_acno), bank_ifsc: s(f.bank_ifsc) };
    if (locked) { delete row.name; delete row.group_id; }
    const { error } = sel ? await supabase.from('ledgers').update(row).eq('id', sel.id) : await supabase.from('ledgers').insert(row);
    if (error) return setErr(map(error));
    setMsg(`${t('ledgerSaved')}: ${row.name || sel.name}`); setSel(null); setF(blank); setQ(''); await load(); b.reload();
    setTimeout(() => refs.current[mode === 'create' ? 'under' : 'name']?.focus(), 30);
  }
  async function doDelete(l) {
    l = l || sel; if (!l) return; setErr(''); setMsg('');
    if (l.sys_role || l.metal || ['Cash', 'Profit & Loss A/c'].includes(l.name)) return setErr(t('locked'));
    if (!confirm(`${t('confirmDeleteLedger')} "${l.name}"?`)) return;
    const { error } = await supabase.from('ledgers').delete().eq('id', l.id);
    if (error) return setErr(map(error));
    setMsg(`${t('ledgerDeleted')}: ${l.name}`); setSel(null); setF(blank); setQ(''); load(); b.reload();
  }
  const quit = () => { if (window.history.length > 1) r.back(); else window.close(); };
  act.current = { save, doDelete, quit, which, close: () => setWhich(null) };
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); act.current.which ? act.current.close() : act.current.quit(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); act.current.doDelete(); }
    };
    const acc = e => { act.current.save(); e.detail.handled = true; };      // Ctrl+A (from the shortcut layer)
    const del = e => { act.current.doDelete(); e.detail.handled = true; };  // Alt+D
    window.addEventListener('keydown', key); window.addEventListener('maxx:accept', acc); window.addEventListener('maxx:deleteItem', del);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('maxx:accept', acc); window.removeEventListener('maxx:deleteItem', del); };
  }, []);

  const grp = gById[f.group_id], upar = grp ? (grp.parent_id ? gById[grp.parent_id]?.name : t('primary')) : '';
  const title = mode === 'alter' ? t('ledgerAlteration') : mode === 'delete' ? t('ledgerDeletion') : t('ledgerCreation');
  const T = (k, key, label, extra = {}) => (<div className="lr"><label>{label} :</label>
    <input className="lf" ref={ref(k)} autoComplete="off" disabled={picking && k !== 'name'} value={f[key]} onChange={set(key)} onKeyDown={enter(k)} {...extra} /></div>);
  const bal = (k, key, label, unit) => (<div className="ob-r"><span className="ob-l">{label} :</span>
    {['Cr', 'Dr'].map(v => <label key={v} className="rd"><input type="radio" name={key} disabled={picking} checked={f[key + '_t'] === v} onChange={() => setF({ ...f, [key + '_t']: v })} /> {v === 'Cr' ? t('credit') : t('debit')}</label>)}
    <input className="lf ob-a" ref={ref(k)} inputMode="decimal" disabled={picking} value={f[key]} onChange={set(key)} onKeyDown={enter(k)} /><span className="ob-u">{unit}</span></div>);
  return (<div className="tg">
    <div className="tgt"><span>{title}</span><b>{b.tenant?.name}</b><span>Esc {t('back')}</span></div>
    <div className="tgb">
      <div className="lc">
        <div>
          <div className="lr"><label>{t('underGroup')} :</label>
            <input className="lf" ref={ref('under')} autoComplete="off" disabled={picking || locked} value={which === 'group' ? q : grp?.name || ''}
              onFocus={e => e.target.select()} onBlur={() => which === 'group' && setWhich(null)}
              onChange={e => { setQ(e.target.value); setIdx(0); setWhich('group'); }} onKeyDown={nav(chooseGroup)} /></div>
          <div className="sub2">{upar && `(${upar})`}</div>
          <div className="lr"><label>{t('accountName')} :</label>
            <input className="lf" ref={ref('name')} autoComplete="off" readOnly={locked} value={picking ? q : f.name}
              onChange={e => picking ? (setQ(e.target.value), setIdx(0), setWhich('ledger')) : setF({ ...f, name: e.target.value })}
              onBlur={() => picking && setWhich(null)} onKeyDown={picking ? nav(pickLedger) : enter('name')} /></div>
          {picking && <div className="hint2">{mode === 'delete' ? t('selectLedgerDelete') : t('selectLedgerAlter')}</div>}
          {T('alias', 'alias', t('aliasName'))}
          {T('gstin', 'gstin', 'GSTIN', { maxLength: 15, onChange: e => setF({ ...f, gstin: e.target.value.toUpperCase() }) })}
          <div className="lr"><label>{t('regType')} :</label>
            <select className="lf" ref={ref('reg')} disabled={picking} value={f.reg_type} onChange={set('reg_type')} onKeyDown={enter('reg')}>{REG.map(x => <option key={x} value={x}>{t('reg_' + x)}</option>)}</select></div>
          {T('pan', 'pan', 'PAN', { maxLength: 10, onChange: e => setF({ ...f, pan: e.target.value.toUpperCase() }) })}
          <div style={{ height: 22 }} />
          {T('address', 'address', t('address'))}{T('street', 'street', t('street'))}{T('city', 'city', t('city'))}{T('pincode', 'pincode', t('pincode'), { inputMode: 'numeric', maxLength: 6 })}
          {T('state', 'state', t('state'), { list: 'states' })}<datalist id="states">{STATES.map(x => <option key={x} value={x} />)}</datalist>
          {T('country', 'country', t('country'))}
          {T('mobile', 'mobile', t('mobileNo'), { inputMode: 'numeric', maxLength: 10 })}{T('email', 'email', t('email'), { type: 'email' })}
          {T('credit', 'credit_days', t('creditPeriod'), { inputMode: 'numeric' })}
        </div>
        <div>
          <div className="ob-h">{t('openingBal')} :</div>
          {bal('cash', 'cash', t('cashBal'), 'Rs.')}{bal('gold', 'gold', t('goldBal'), 'Grm')}{bal('silver', 'silver', t('silverBal'), 'Grm.')}
          <div className="hint2" style={{ marginLeft: 0, marginTop: 8 }}>{sel?.sys_role === 'capital' ? t('capitalHint') : t('openingHint')}</div>
          <div className="ob-h" style={{ marginTop: 26 }}>{t('bankDetails')} :</div>
          <div style={{ paddingTop: 6 }}>{T('bhold', 'bank_holder', t('bankHolder'))}{T('bacno', 'bank_acno', t('bankAcno'))}{T('bifsc', 'bank_ifsc', t('bankIfsc'), { maxLength: 11, onChange: e => setF({ ...f, bank_ifsc: e.target.value.toUpperCase() }) })}</div>
          {locked && <div className="hint2">{t('locked')}</div>}
          {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
        </div>
      </div>
      {which && <div className="tgr"><div className="lh">{which === 'ledger' ? t('listOfLedgers') : t('listOfGroups')}</div>
        <div className="ll">{items.map((g, i) => <div key={g.id} className={'li' + (i === idx ? ' on' : '')} onMouseDown={e => e.preventDefault()} onClick={() => which === 'ledger' ? pickLedger(g) : chooseGroup(g)}>
          {g.name}{which === 'ledger' && g.account_groups?.name && <small style={{ opacity: .7 }}> · {g.account_groups.name}</small>}</div>)}
          {!items.length && <div className="li muted">{t('noEntries')}</div>}</div></div>}
    </div>
    <div className="tgk">
      <button className="tk" title="Esc" onClick={quit}><u>Q</u>: {t('quitKey')}</button>
      <button className="tk" title="Ctrl + A" disabled={picking} onClick={save}><u>A</u>: {t('accept')}</button>
      <button className="tk" title="Ctrl + D" disabled={!sel || locked} onClick={() => doDelete()}><u>D</u>: {t('delete')}</button>
    </div></div>);
}
