'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { useBooks, useHash } from '../../../lib/acc';
import { useT } from '../../../lib/i18n';

const blank = { name: '', alias: '', parent_id: null, nature: 'asset' };
const NATURES = ['asset', 'liability', 'income', 'expense'];

export default function Groups() {
  const { t } = useT(); const r = useRouter(); const b = useBooks(); const h = useHash();
  const mode = ['alter', 'delete'].includes(h) ? h : 'create';
  const [groups, setGroups] = useState([]); const [f, setF] = useState(blank); const [sel, setSel] = useState(null);
  const [q, setQ] = useState(''); const [idx, setIdx] = useState(0); const [open, setOpen] = useState(false);
  const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const refs = useRef({}); const act = useRef({});

  const load = async () => { const { data, error } = await supabase.from('account_groups').select('*').order('name'); if (error) setErr(error.message); setGroups(data || []); };
  useEffect(() => { if (b.ready) load(); }, [b.ready]);
  useEffect(() => { setSel(null); setF(blank); setQ(''); setErr(''); setMsg(''); setIdx(0); setOpen(false); setTimeout(() => refs.current.name?.focus(), 50); }, [mode]);

  const byId = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g])), [groups]);
  const picking = mode !== 'create' && !sel, locked = !!sel?.is_default;
  const below = id => { const out = new Set([id]); let grew = true; while (grew) { grew = false; groups.forEach(g => { if (g.parent_id && out.has(g.parent_id) && !out.has(g.id)) { out.add(g.id); grew = true; } }); } return out; };
  const items = useMemo(() => {
    const ex = sel ? below(sel.id) : new Set();
    const base = picking ? groups : [{ id: '', name: t('primary') }, ...groups.filter(g => !ex.has(g.id))];
    return base.filter(g => !q || g.name.toLowerCase().includes(q.toLowerCase()));
  }, [groups, q, picking, sel]);
  useEffect(() => { document.querySelector('.li.on')?.scrollIntoView({ block: 'nearest' }); }, [idx, items, open]);

  const map = e => /Default/.test(e.message) ? t('defaultLocked') : /foreign/.test(e.message) ? t('groupInUse') : /column|schema cache/.test(e.message) ? t('runSql') : e.message;
  const order = ['name', 'alias', 'under', ...(f.parent_id === '' ? ['nature'] : [])];
  const next = k => { const n = order[order.indexOf(k) + 1]; n ? refs.current[n]?.focus() : save(); };
  const ref = k => el => { refs.current[k] = el; };
  const enter = k => e => { if (e.key === 'Enter') { e.preventDefault(); next(k); } };

  function loadForEdit(g) {
    setSel(g); setQ(''); setErr(''); setMsg(''); setOpen(false);
    setF({ name: g.name, alias: g.alias || '', parent_id: g.parent_id || '', nature: g.nature });
    setTimeout(() => refs.current.alias?.focus(), 30);
  }
  function chooseUnder(g) { setF({ ...f, parent_id: g.id, nature: g.id ? byId[g.id].nature : f.nature }); setOpen(false); setQ(''); setIdx(0); setTimeout(() => refs.current[g.id === '' ? 'nature' : 'accept']?.focus(), 30); }
  // The List of Groups opens only when you type in the field (or press the down arrow) and closes once a group is chosen
  const nav = choose => e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setQ(''); setIdx(0); setOpen(true); return; }
      setIdx(i => e.key === 'ArrowDown' ? Math.min(i + 1, items.length - 1) : Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && items[idx]) choose(items[idx]); else if (!picking) next('under');
    }
  };
  const pick = g => picking ? (mode === 'delete' ? doDelete(g) : loadForEdit(g)) : chooseUnder(g);

  async function save() {
    setErr(''); setMsg(''); if (picking) return;
    if (!f.name.trim()) return setErr(t('nameRequired'));
    if (f.parent_id === null) return setErr(t('underRequired'));
    const par = f.parent_id ? byId[f.parent_id] : null;
    const row = { name: f.name.trim(), alias: f.alias.trim() || null, parent_id: f.parent_id || null, nature: par ? par.nature : f.nature };
    if (locked) { delete row.name; delete row.parent_id; delete row.nature; }
    const { error } = sel ? await supabase.from('account_groups').update(row).eq('id', sel.id) : await supabase.from('account_groups').insert(row);
    if (error) return setErr(map(error));
    setMsg(`${t('groupSaved')}: ${row.name || sel.name}`); setSel(null); setF(blank); setQ(''); await load(); setTimeout(() => refs.current.name?.focus(), 30);
  }
  async function doDelete(g) {
    g = g || sel; if (!g) return; setErr(''); setMsg('');
    if (g.is_default) return setErr(t('defaultLocked'));
    if (!confirm(`${t('confirmDeleteGroup')} "${g.name}"?`)) return;
    const { error } = await supabase.from('account_groups').delete().eq('id', g.id);
    if (error) return setErr(map(error));
    setMsg(`${t('groupDeleted')}: ${g.name}`); setSel(null); setF(blank); setQ(''); load();
  }
  const quit = () => r.push('/dashboard');
  act.current = { save, doDelete, quit, open, closeList: () => setOpen(false) };
  useEffect(() => {
    const k = e => {
      if (e.key === 'Escape') { e.preventDefault(); act.current.open ? act.current.closeList() : act.current.quit(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); act.current.save(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); act.current.doDelete(); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const parent = f.parent_id ? byId[f.parent_id] : null;
  const upar = parent ? (parent.parent_id ? byId[parent.parent_id]?.name : t('primary')) : '';
  const title = mode === 'alter' ? t('groupAlteration') : mode === 'delete' ? t('groupDeletion') : t('groupCreation');
  return (<div className="tg">
    <div className="tgt"><span>{title}</span><b>{b.tenant?.name}</b><span>Ctrl + M</span></div>
    <div className="tgb">
      <div className="tgl">
        <div className="fr"><label>{t('nameLabel')}</label><span>:</span>
          <input className="tf big" ref={ref('name')} autoComplete="off" value={picking ? q : f.name} readOnly={locked}
            onChange={e => picking ? (setQ(e.target.value), setIdx(0), setOpen(true)) : setF({ ...f, name: e.target.value })}
            onBlur={() => picking && setOpen(false)}
            onKeyDown={picking ? nav(pick) : enter('name')} /></div>
        {picking && <div className="hint">{mode === 'delete' ? t('selectDelete') : t('selectAlter')}</div>}
        <div className="fr"><label><i>{t('aliasLabel')}</i></label><span>:</span>
          <input className="tf" ref={ref('alias')} autoComplete="off" disabled={picking} value={f.alias} onChange={e => setF({ ...f, alias: e.target.value })} onKeyDown={enter('alias')} /></div>
        <div className="fr" style={{ marginTop: 34 }}><label>{t('under')}</label><span>:</span>
          <input className="tf big" ref={ref('under')} autoComplete="off" disabled={picking} readOnly={locked}
            value={open ? q : parent ? parent.name : f.parent_id === '' ? t('primary') : ''}
            onFocus={e => e.target.select()} onBlur={() => setOpen(false)}
            onChange={e => { setQ(e.target.value); setIdx(0); setOpen(true); }} onKeyDown={nav(chooseUnder)} /></div>
        <div className="sub">{upar && `(${upar})`}</div>
        {f.parent_id === '' && <div className="fr"><label>{t('natureOfGroup')}</label><span>:</span>
          <select className="tf" ref={ref('nature')} value={f.nature} onChange={e => setF({ ...f, nature: e.target.value })} onKeyDown={enter('nature')}>{NATURES.map(n => <option key={n}>{n}</option>)}</select></div>}
        {locked && <div className="hint">{t('defaultLocked')}</div>}
        {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
      </div>
      {open && <div className="tgr"><div className="lh">{t('listOfGroups')}</div>
        <div className="ll">{items.map((g, i) => <div key={g.id || 'primary'} className={'li' + (i === idx ? ' on' : '')} onMouseDown={e => e.preventDefault()} onClick={() => pick(g)}>{g.name}</div>)}
          {!items.length && <div className="li muted">{t('noEntries')}</div>}</div></div>}
    </div>
    <div className="tgk">
      <button className="tk" title="Esc" onClick={quit}><u>Q</u>: {t('quitKey')}</button>
      <button className="tk" ref={ref('accept')} title="Ctrl + A" disabled={picking} onClick={save}><u>A</u>: {t('accept')}</button>
      <button className="tk" title="Ctrl + D" disabled={!sel || locked} onClick={() => doDelete()}><u>D</u>: {t('delete')}</button>
    </div></div>);
}
