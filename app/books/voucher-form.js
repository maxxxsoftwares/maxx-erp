'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { n2, r3, money, today } from '../../lib/acc';
import { useT } from '../../lib/i18n';
import Shell from './shell';

const CB = ['Cash-in-hand', 'Bank Accounts'];
const fineOf = r => r3((+r.gross || 0) * (+r.purity || 0) / 100);
const valOf = (r, m) => n2(fineOf(r) * (+r.rate || 0) / (m === 'gold' ? 10 : 1000)); // gold: rate per 10 g, silver: per kg
const blank = () => ({ mode: 'cash', ledger: '', amount: '', gross: '', purity: '', rate: '', side: 'Dr' });
// Gold rate is per 10 g and silver per kg, the same units as the live MCX strip
const live = m => { try { const j = JSON.parse(localStorage.getItem('liveRates') || '{}'); return j[m] ? String(Math.round(j[m])) : ''; } catch { return ''; } };

export default function Form({ b, type, initial }) {
  const { t } = useT(); const r = useRouter(); const isJ = !!initial || ['journal', 'contra', 'sales', 'purchase'].includes(type), isPay = type === 'payment';
  const [date, setDate] = useState(initial?.date || today()); const [narr, setNarr] = useState(initial?.narr || ''); const [party, setParty] = useState('');
  const [rows, setRows] = useState(initial ? initial.rows : isJ ? [{ ...blank(), side: 'Dr' }, { ...blank(), side: 'Cr' }] : [blank()]);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const L = b.ledgers, gn = l => l.account_groups?.name;
  const cash = L.filter(l => gn(l) === 'Cash-in-hand'), bank = L.filter(l => gn(l) === 'Bank Accounts');
  const parties = L.filter(l => !l.metal && !CB.includes(gn(l)));
  const metalL = m => L.find(l => l.metal === m);
  const modes = ['cash', 'bank', ...(b.tenant.gold_trade ? ['gold'] : []), ...(b.tenant.silver_trade ? ['silver'] : [])];

  const resolve = row => {
    let ledger = row.ledger, metal = null;
    if (!isJ && (row.mode === 'gold' || row.mode === 'silver')) { metal = row.mode; ledger = metalL(metal)?.id; }
    else if (isJ) metal = L.find(x => x.id === row.ledger)?.metal || null;
    else if (row.mode === 'cash' && !ledger) ledger = cash[0]?.id;
    return { ledger, metal, amount: metal ? valOf(row, metal) : n2(row.amount), fine: metal ? fineOf(row) : null };
  };
  const mk = (x, row, dr) => ({ ledger_id: x.ledger, dr: dr ? x.amount : 0, cr: dr ? 0 : x.amount, metal: x.metal,
    gross_wt: x.metal ? +row.gross || null : null, purity: x.metal ? +row.purity || null : null, fine_wt: x.fine, rate: x.metal ? +row.rate || null : null });

  const res = rows.map(resolve);
  let lines = [];
  if (isJ) rows.forEach((row, i) => { if (res[i].ledger && res[i].amount > 0) lines.push(mk(res[i], row, row.side === 'Dr')); });
  else {
    const set = []; rows.forEach((row, i) => { if (res[i].ledger && res[i].amount > 0) set.push(mk(res[i], row, !isPay)); });
    const tot = n2(set.reduce((s, l) => s + l.dr + l.cr, 0));
    lines = party && tot > 0 ? [{ ledger_id: party, dr: isPay ? tot : 0, cr: isPay ? 0 : tot }, ...set] : [];
  }
  const dr = n2(lines.reduce((s, l) => s + l.dr, 0)), cr = n2(lines.reduce((s, l) => s + l.cr, 0));
  const ok = lines.length >= 2 && dr === cr && dr > 0;

  async function save() {
    if (!ok || busy) return; setBusy(true); setErr(''); setMsg('');
    const { data, error } = initial?.id ? await supabase.rpc('update_voucher', { p: { id: initial.id, vdate: date, narration: narr, lines } }) : await supabase.rpc('save_voucher', { p: { vtype: type, vdate: date, narration: narr, lines } });
    setBusy(false);
    if (error) return setErr(error.message);
    try { localStorage.setItem('lastNarr:' + type, narr); } catch {}
    if (initial?.id) return r.push('/books/daybook');
    setMsg(`${t('saved')} ${t(type)} #${data}`); setParty(''); setNarr('');
    setRows(isJ ? [{ ...blank(), side: 'Dr' }, { ...blank(), side: 'Cr' }] : [blank()]);
  }
  const ref = useRef(); ref.current = save;
  useEffect(() => {
    const acc = e => { ref.current(); e.detail.handled = true; };                                   // Ctrl+A
    const rep = e => { const n = localStorage.getItem('lastNarr:' + type); if (n) { setNarr(n); e.detail.handled = true; } }; // Ctrl+R
    const alter = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); window.open('/books/ledgers#alter', '_blank'); } }; // Ctrl+Enter
    window.addEventListener('maxx:accept', acc); window.addEventListener('maxx:repeatNarr', rep); window.addEventListener('keydown', alter);
    return () => { window.removeEventListener('maxx:accept', acc); window.removeEventListener('maxx:repeatNarr', rep); window.removeEventListener('keydown', alter); };
  }, []);

  const upd = (i, p) => setRows(rows.map((q, j) => j === i ? { ...q, ...p } : q));
  const [g, setG] = useState({ party: '', taxable: '', rate: '3', inter: false });
  const byName = n => L.find(x => x.name === n)?.id;
  const fillGst = () => {
    const tx = n2(g.taxable), tax = n2(tx * +g.rate / 100), half = n2(tax / 2), S = type === 'sales';
    const R = (ledger, amount, side) => ({ ...blank(), mode: 'ledger', ledger, amount: String(amount), side });
    const pre = S ? 'Output ' : 'Input ', tside = S ? 'Cr' : 'Dr', base = byName(S ? 'Sales' : 'Purchase');
    const tr = g.inter ? [R(byName(pre + 'IGST'), tax, tside)] : [R(byName(pre + 'CGST'), half, tside), R(byName(pre + 'SGST'), n2(tax - half), tside)];
    if (!g.party || !base || tx <= 0 || tr.some(x => !x.ledger)) return setErr(t('gstNeed'));
    setErr(''); setRows([R(g.party, n2(tx + tax), S ? 'Dr' : 'Cr'), R(base, tx, S ? 'Cr' : 'Dr'), ...tr]);
  };
  const addRow = () => setRows([...rows, { ...blank(), mode: isJ ? 'ledger' : 'cash', side: dr > cr ? 'Cr' : 'Dr' }]);
  const num = (i, k, ph) => <input inputMode="decimal" style={{ width: 90 }} placeholder={ph} value={rows[i][k]} onChange={e => upd(i, { [k]: e.target.value })} />;

  return (<Shell title={`${t('voucherEntry')}: ${t(type)}`} company={b.tenant.name}>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
      <div><label>{t('date')}</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <div><label>{t('voucherNo')}</label><input disabled value="Auto" style={{ width: 90 }} /></div>
      {!isJ && <div style={{ flex: 1, minWidth: 200 }}><label>{t('account')}</label>
        <select value={party} onChange={e => setParty(e.target.value)}><option value="" />{parties.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>}
    </div>
    {(type === 'sales' || type === 'purchase') && !initial && <div className="card" style={{ padding: 10 }}><b>{t('gstHelper')}</b>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
        <div style={{ flex: 1, minWidth: 180 }}><label>{t('account')}</label><select value={g.party} onChange={e => setG({ ...g, party: e.target.value })}><option value="" />{parties.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div><label>{t('taxable')}</label><input inputMode="decimal" style={{ width: 120 }} value={g.taxable} onChange={e => setG({ ...g, taxable: e.target.value })} /></div>
        <div><label>{t('gstRate')} %</label><select style={{ width: 90 }} value={g.rate} onChange={e => setG({ ...g, rate: e.target.value })}>{['0', '3', '5', '12', '18', '28'].map(x => <option key={x}>{x}</option>)}</select></div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto', minHeight: 0 }} checked={g.inter} onChange={e => setG({ ...g, inter: e.target.checked })} />{t('interState')}</label>
        <button className="ghost" style={{ color: 'var(--pine)' }} onClick={fillGst}>{t('fill')}</button></div></div>}
    <table className="tt"><thead><tr><th>{isJ ? 'Dr / Cr' : t('mode')}</th><th>{t('particulars')}</th><th className="num">{t('amount')}</th><th /></tr></thead>
      <tbody>{rows.map((row, i) => { const x = res[i]; return (<tr key={i}>
        <td style={{ width: 110 }}>{isJ
          ? <select value={row.side} onChange={e => upd(i, { side: e.target.value })}><option>Dr</option><option>Cr</option></select>
          : <select value={row.mode} onChange={e => upd(i, { mode: e.target.value, ledger: '', rate: live(e.target.value) })}>{modes.map(m => <option key={m} value={m}>{t(m)}</option>)}</select>}</td>
        <td>
          {isJ ? <select value={row.ledger} onChange={e => upd(i, { ledger: e.target.value })}><option value="" />{L.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
            : x.metal ? <b>{t(x.metal)}</b>
            : <select value={row.ledger || (row.mode === 'cash' ? cash[0]?.id : '')} onChange={e => upd(i, { ledger: e.target.value })}><option value="" />{(row.mode === 'cash' ? cash : bank).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>}
          {x.metal && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
            {num(i, 'gross', t('weight') + ' (g)')}{num(i, 'purity', t('purity') + ' %')}{num(i, 'rate', x.metal === 'gold' ? '₹/10g' : '₹/kg')}
            <span className="muted">{t('fine')}: {x.fine}</span></div>}
        </td>
        <td className="num" style={{ width: 130 }}>{x.metal ? money(x.amount) : <input className="num" inputMode="decimal" value={row.amount} onChange={e => upd(i, { amount: e.target.value })} />}</td>
        <td style={{ width: 40 }}>{rows.length > (isJ ? 2 : 1) && <button className="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>}</td></tr>); })}
        <tr className="tot"><td colSpan={2}>{isJ ? `Dr ${money(dr)}   Cr ${money(cr)}   ${t('difference')}: ${money(dr - cr)}` : t('total')}</td><td className="num">{isJ ? '' : money(dr)}</td><td /></tr>
      </tbody></table>
    <button className="ghost" style={{ marginTop: 8 }} onClick={addRow}>+ {t('addRow')}</button>
    <label>{t('narration')}</label><input value={narr} onChange={e => setNarr(e.target.value)} />
    {isJ && lines.length > 0 && <div className={ok ? 'ok' : 'err'}>{ok ? t('balanced') : t('notBalanced')}</div>}
    {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
    <button className="full gold" disabled={!ok || busy} onClick={save}>{t('save')} (Ctrl+A)</button>
  </Shell>);
}
