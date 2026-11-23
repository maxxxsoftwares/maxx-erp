'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useBooks } from '../../../lib/acc';
import { useT, money } from '../../../lib/i18n';
import Shell from '../shell';

const blank = { name: '', description: '', category: '', price: '', image_url: '', stock_qty: 0, unit: 'pcs' };

export default function StockItems() {
  const { t } = useT(); const b = useBooks();
  const [items, setItems] = useState([]);
  const [f, setF] = useState(blank);
  const [ed, setEd] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (b.ready) {
      supabase.from('stock_items').select('*').order('name').then(({ data }) => setItems(data || []));
    }
  }, [b.ready]);

  const set = k => e => {
    if (k === 'image_url') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => { setPreview(reader.result); setF({ ...f, image_url: reader.result }); };
        reader.readAsDataURL(file);
      }
    } else {
      setF({ ...f, [k]: e.target.value });
    }
  };

  async function save(e) {
    e.preventDefault(); setErr(''); setMsg('');
    const row = {
      name: f.name.trim(),
      description: f.description || null,
      category: f.category || null,
      price: +f.price || 0,
      image_url: f.image_url || null,
      stock_qty: +f.stock_qty || 0,
      unit: f.unit || 'pcs'
    };
    const { error } = ed ? await supabase.from('stock_items').update(row).eq('id', ed) : await supabase.from('stock_items').insert(row);
    if (error) return setErr(error.message);
    setF(blank); setEd(null); setPreview('');
    supabase.from('stock_items').select('*').order('name').then(({ data }) => setItems(data || []));
    setMsg(t('saved'));
  }

  const alter = it => { setEd(it.id); setF({ name: it.name, description: it.description || '', category: it.category || '', price: String(it.price), image_url: it.image_url || '', stock_qty: it.stock_qty, unit: it.unit }); if (it.image_url) setPreview(it.image_url); window.scrollTo(0, 0); };

  async function del(it) {
    if (!confirm(t('confirmDeleteItem'))) return;
    const { error } = await supabase.from('stock_items').delete().eq('id', it.id);
    if (error) return setErr(error.message);
    supabase.from('stock_items').select('*').order('name').then(({ data }) => setItems(data || []));
  }

  return (<Shell title={t('stockItems')} company={b.tenant?.name}>
    <form onSubmit={save} style={{ maxWidth: 600 }}>
      <div className="card">
        <h3>{ed ? t('alter') : t('createNew')}</h3>
        <label>{t('catName')}</label><input required value={f.name} onChange={set('name')} />
        <label>{t('description')}</label><textarea value={f.description} onChange={set('description')} rows={2} />
        <label>{t('category')}</label><input value={f.category} onChange={set('category')} />
        <div style={{display:'flex',gap:8}}>
          <div style={{flex:1}}><label>{t('price')}</label><input inputMode="decimal" value={f.price} onChange={set('price')} /></div>
          <div style={{width:100}}><label>{t('qty')}</label><input inputMode="numeric" value={f.stock_qty} onChange={set('stock_qty')} /></div>
        </div>
        <label>{t('unit')}</label><select value={f.unit} onChange={set('unit')}>
          <option value="pcs">PCS</option><option value="kg">KG</option><option value="g">G</option><option value="mtr">MTR</option>
        </select>
        <label>{t('uploadImage')}</label><input type="file" accept="image/*" onChange={set('image_url')} />
        {preview && <div style={{marginTop:8}}><img src={preview} alt="Preview" style={{maxWidth:'100%',maxHeight:150,borderRadius:8,border:'1px solid var(--line)'}} /></div>}
      </div>
      {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
      <button className="full gold">{ed ? t('alter') : t('save')}</button>
      {ed && <button type="button" className="full ghost" style={{color:'var(--pine)'}} onClick={() => { setEd(null); setF(blank); setPreview(''); }}>{t('quit')}</button>}
    </form>
    {err && <div className="err">{err}</div>}
    <table className="tt" style={{marginTop:20}}><thead><tr><th>{t('catName')}</th><th>{t('category')}</th><th className="num">{t('price')}</th><th className="num">{t('qty')}</th><th>{t('image')}</th><th /></tr></thead>
      <tbody>{items.map(it => <tr key={it.id}><td>{it.name}</td><td>{it.category || ''}</td><td className="num">{money(it.price)}</td><td className="num">{it.stock_qty} {it.unit}</td>
        <td>{it.image_url ? <img src={it.image_url} alt="" style={{width:40,height:40,objectFit:'cover',borderRadius:4}} /> : <span className="muted">-</span>}</td>
        <td style={{whiteSpace:'nowrap'}}><button className="ghost" onClick={() => alter(it)}>{t('alter')}</button>{' '}
        <button className="ghost" style={{color:'var(--bad)'}} onClick={() => del(it)}>{t('delete')}</button></td></tr>)}</tbody></table>
  </Shell>);
}