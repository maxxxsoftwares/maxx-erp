'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { useTenant, money, today, r3, n2 } from '../../../../lib/acc';
import { apply } from '../../../../lib/karigar';
import { useT } from '../../../../lib/i18n';
import JShell from '../../jshell';
const PUR = { gold: 91.6, silver: 92.5 };
const item = m => ({ category_id: '', description: '', gross_wt: '', stone_wt: '', purity: String(PUR[m]), making_value: '' });
export default function Karigar() {
  const { id } = useParams(); const { t } = useT(); const r = useRouter(); const tn = useTenant();
  const [k, setK] = useState(null); const [tx, setTx] = useState([]); const [cats, setCats] = useState([]); const [mode, setMode] = useState('');
  const [f, setF] = useState({ date: today(), metal: 'gold', gross: '', purity: '99.9', amount: '', note: '', wastage: '', labour: '' });
  const [items, setItems] = useState([item('gold')]); const [err, setErr] = useState('');
  const load = async () => {
    const a = (await supabase.from('karigars').select('*').eq('id', id).single()).data;
    setK(a); setF(x => ({ ...x, wastage: String(a?.wastage_pct ?? '') }));
    setTx((await supabase.from('karigar_txns').select('*').eq('karigar_id', id).order('txn_date').order('created_at')).data || []);
    setCats((await supabase.from('item_categories').select('*').order('name')).data || []);
  };
  useEffect(() => { if (tn.ready) load(); }, [tn.ready]);
  if (!k) return <JShell title={t('loading')}><p>{t('loading')}</p></JShell>;
  const set = key => e => setF({ ...f, [key]: e.target.value });
  const open = m => { setMode(m); setErr(''); };
  // receive-goods calculations
  const net = r3(items.reduce((s, x) => s + (+x.gross_wt || 0) - (+x.stone_wt || 0), 0));
  const fine = r3(items.reduce((s, x) => s + ((+x.gross_wt || 0) - (+x.stone_wt || 0)) * (+x.purity || 0) / 100, 0));
  const wfine = r3(fine * (+f.wastage || 0) / 100);
  const autoLab = n2(k.labour_type === 'per_gram' ? net * k.labour_rate : items.filter(x => +x.gross_wt > 0).length * k.labour_rate);
  const labour = f.labour === '' ? autoLab : n2(f.labour);
  const upItem = (i, key, v) => setItems(items.map((x, j) => j === i ? { ...x, [key]: v } : x));

  async function saveSimple(e) {
    e.preventDefault(); setErr('');
    const row = { karigar_id: id, txn_date: f.date, kind: mode, note: f.note };
    if (mode === 'payment') Object.assign(row, { cash_amount: +f.amount });
    else Object.assign(row, { metal: f.metal, gross_wt: +f.gross, purity: +f.purity, fine_wt: r3((+f.gross || 0) * (+f.purity || 0) / 100) });
    const { error } = await supabase.from('karigar_txns').insert(row);
    if (error) return setErr(error.message); setMode(''); setF({ ...f, gross: '', amount: '', note: '' }); load();
  }
  async function saveReceive(e) {
    e.preventDefault(); setErr('');
    const { data, error } = await supabase.rpc('karigar_receive', { p: { karigar_id: id, txn_date: f.date, metal: f.metal, wastage_pct: f.wastage, labour_amount: labour, note: f.note, items: items.filter(x => +x.gross_wt > 0) } });
    if (error) return setErr(error.message);
    sessionStorage.setItem('printTags', JSON.stringify(data.tags)); r.push('/jewellery/print');
  }
  const run = { gold: 0, silver: 0, cash: 0 };
  const led = tx.map(x => { apply(run, x); return { ...x, b: { ...run } }; });
  const bal = led.length ? led[led.length - 1].b : run;
  const col = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '0 12px' };
  const Date_ = <div><label>{t('date')}</label><input type="date" value={f.date} onChange={set('date')} /></div>;
  const Metal = <div><label>{t('metalType')}</label><select value={f.metal} onChange={e => { setF({ ...f, metal: e.target.value, purity: e.target.value === 'gold' ? '99.9' : '99.9' }); setItems([item(e.target.value)]); }}><option value="gold">{t('gold')}</option><option value="silver">{t('silver')}</option></select></div>;
  return (<JShell title={k.name} company={tn.tenant?.name}>
    <p className="muted">{k.mobile} · {t('wastagePct')}: {k.wastage_pct}% · {t('labourRate')}: {k.labour_rate} ({k.labour_type === 'per_gram' ? t('perGram') : t('perPiece')})</p>
    <div className="grid" style={{ marginBottom: 12 }}>
      <div className="tile">{t('gold')} · {t('fineHeld')}<br />{r3(bal.gold).toFixed(3)} g</div>
      <div className="tile">{t('silver')} · {t('fineHeld')}<br />{r3(bal.silver).toFixed(3)} g</div>
      <div className="tile">{t('cashPayable')}<br />{money(bal.cash)}</div></div>
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {['issue', 'receive', 'return', 'payment'].map(m => <button key={m} className={mode === m ? 'gold' : ''} onClick={() => open(m)}>{t('k_' + m)}</button>)}</div>

    {(mode === 'issue' || mode === 'return') && <form onSubmit={saveSimple} className="card" style={{ marginTop: 12 }}>
      <div style={col}>{Date_}{Metal}
        <div><label>{t('weight')} (g)</label><input required inputMode="decimal" value={f.gross} onChange={set('gross')} /></div>
        <div><label>{t('purity')} %</label><input inputMode="decimal" value={f.purity} onChange={set('purity')} /></div>
        <div><label>{t('note')}</label><input value={f.note} onChange={set('note')} /></div></div>
      <p className="muted">{t('fine')}: <b>{r3((+f.gross || 0) * (+f.purity || 0) / 100)}</b> g</p>
      {err && <div className="err">{err}</div>}<button className="gold">{t('save')}</button></form>}

    {mode === 'payment' && <form onSubmit={saveSimple} className="card" style={{ marginTop: 12 }}>
      <div style={col}>{Date_}<div><label>{t('amount')}</label><input required inputMode="decimal" value={f.amount} onChange={set('amount')} /></div>
        <div><label>{t('note')}</label><input value={f.note} onChange={set('note')} /></div></div>
      {err && <div className="err">{err}</div>}<button className="gold" style={{ marginTop: 10 }}>{t('save')}</button></form>}

    {mode === 'receive' && <form onSubmit={saveReceive} className="card" style={{ marginTop: 12 }}>
      <div style={col}>{Date_}{Metal}
        <div><label>{t('wastagePct')}</label><input inputMode="decimal" value={f.wastage} onChange={set('wastage')} /></div>
        <div><label>{t('labour')} ({t('amount')})</label><input inputMode="decimal" placeholder={String(autoLab)} value={f.labour} onChange={set('labour')} /></div></div>
      <b>{t('finishedItems')}</b>
      <div style={{ overflowX: 'auto' }}><table className="tt"><thead><tr><th>{t('category')}</th><th>{t('itemDesc')}</th><th>{t('grossWt')}</th><th>{t('stoneWt')}</th><th>{t('purity')}</th><th>{t('making')} /g</th><th /></tr></thead>
        <tbody>{items.map((x, i) => <tr key={i}>
          <td><select value={x.category_id} onChange={e => upItem(i, 'category_id', e.target.value)}><option value="" />{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
          <td><input value={x.description} onChange={e => upItem(i, 'description', e.target.value)} /></td>
          {['gross_wt', 'stone_wt', 'purity', 'making_value'].map(key => <td key={key}><input style={{ width: 80 }} inputMode="decimal" value={x[key]} onChange={e => upItem(i, key, e.target.value)} /></td>)}
          <td>{items.length > 1 && <button type="button" className="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</button>}</td></tr>)}</tbody></table></div>
      <button type="button" className="ghost" style={{ marginTop: 8, color: 'var(--pine)' }} onClick={() => setItems([...items, item(f.metal)])}>+ {t('addRow')}</button>
      <p className="muted">{t('netWt')}: <b>{net}</b> g · {t('fine')}: <b>{fine}</b> g · {t('wastageFine')}: <b>{wfine}</b> g · {t('totalDebit')}: <b>{r3(fine + wfine)}</b> g · {t('labour')}: <b>{money(labour)}</b></p>
      <label>{t('note')}</label><input value={f.note} onChange={set('note')} />
      {err && <div className="err">{err}</div>}<button className="full gold">{t('saveReceive')}</button></form>}

    <h3>{t('ledger')}</h3>
    <div style={{ overflowX: 'auto' }}><table className="tt"><thead><tr><th>{t('date')}</th><th>{t('kind')}</th><th>{t('particulars')}</th><th className="num">{t('gold')} {t('balance')}</th><th className="num">{t('silver')} {t('balance')}</th><th className="num">{t('cashPayable')}</th></tr></thead>
      <tbody>{!led.length && <tr><td colSpan={6} className="muted">{t('noEntries')}</td></tr>}
        {led.map(x => <tr key={x.id}><td>{x.txn_date}</td><td>{t('k_' + x.kind)}</td>
          <td>{x.kind === 'payment' ? money(x.cash_amount) : `${t(x.metal)} ${x.gross_wt}g @ ${x.purity}% → ${x.fine_wt}g fine`}
            {x.kind === 'receive' && <span className="muted"> · {t('wastageFine')} {x.wastage_fine}g · {t('labour')} {money(x.labour_amount)}</span>}{x.note && <div className="muted">{x.note}</div>}</td>
          <td className="num">{r3(x.b.gold).toFixed(3)}</td><td className="num">{r3(x.b.silver).toFixed(3)}</td><td className="num">{money(x.b.cash)}</td></tr>)}</tbody></table></div>
  </JShell>);
}
