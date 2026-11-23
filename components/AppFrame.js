'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';
import { menuFor, hrefOf } from '../lib/menu';
import RateStrip from './RateStrip';

const ICON = {
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  accountInfo: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  inventoryInfo: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
  accountingVoucher: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  display: 'M18 20V10 M12 20V4 M6 20v-6',
  settings: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  backupRestore: 'M12 8c4.42 0 8-1.12 8-2.5S16.42 3 12 3 4 4.12 4 5.5 7.58 8 12 8z M4 5.5v13C4 19.88 7.58 21 12 21s8-1.12 8-2.5v-13 M4 12c0 1.38 3.58 2.5 8 2.5s8-1.12 8-2.5',
  importExport: 'M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3',
};
const Ico = ({ k }) => <svg className="ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICON[k] || ICON.display} /></svg>;
const Chev = ({ up }) => <svg className={'chev' + (up ? ' up' : '')} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

function Calc({ onClose }) {
  const { t } = useT(); const [x, setX] = useState(''); const [res, setRes] = useState('');
  const run = () => { try { if (!/^[0-9+\-*/().%\s]+$/.test(x)) throw new Error('bad'); const v = Function('"use strict";return (' + x.replace(/%/g, '/100') + ')')(); setRes(String(Math.round(v * 1e6) / 1e6)); } catch { setRes('Error'); } };
  return (<div className="calc"><div className="calch"><b>{t('calculator')}</b><button className="ghost" onClick={onClose}>×</button></div>
    <input autoFocus inputMode="decimal" placeholder="12*3+5" value={x} onChange={e => setX(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); run(); } if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }} />
    <div className="calcr">{res}</div></div>);
}

export default function AppFrame({ children }) {
  const { t, toggle } = useT(); const r = useRouter(); const path = usePathname();
  const [tn, setTn] = useState(null); const [many, setMany] = useState(false); const [open, setOpen] = useState(false);
  const [openG, setOpenG] = useState({}); const [me, setMe] = useState(''); const [role, setRole] = useState(''); const [calc, setCalc] = useState(false); const [fly, setFly] = useState(null); const [menu, setMenu] = useState(false); const timer = useRef();
  const st = tn?.setup_type, groups = st ? menuFor(st, role) : [];
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return r.replace('/');
    const { data } = await supabase.from('profiles').select('name, role, tenants(name,setup_type)').eq('id', user.id).single();
    if (!data?.tenants) return r.replace('/'); setTn(data.tenants); setMe(data.name || ''); setRole(data.role || '');
    const { count } = await supabase.from('user_tenants').select('tenant_id', { count: 'exact', head: true }); setMany((count || 0) > 1);
  })(); }, []);
  useEffect(() => { setOpen(false); setFly(null); }, [path]);
  // Menu starts fully collapsed on the desktop; on any other page only the group holding that page opens
  useEffect(() => {
    if (!st) return;
    const base = h => (h || '').split('#')[0];
    const g = menuFor(st, role).find(x => x.items.some(i => base(hrefOf(i, st)) === path || (i.sub || []).some(s => base(hrefOf(s, st)) === path)));
    setOpenG(g ? { [g.k]: true } : {});
  }, [st, role, path]);
  const go = h => { setFly(null); setOpen(false); r.push(h); setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 120); };

  // Keyboard shortcuts for the items this setup can see
  const map = {};
  groups.forEach(g => g.items.forEach(i => { if (i.key && hrefOf(i, st)) map[i.key] = hrefOf(i, st); (i.sub || []).forEach(s => { if (s.key && hrefOf(s, st)) map[s.key] = hrefOf(s, st); }); }));
  const fire = name => { const ev = new CustomEvent('maxx:' + name, { detail: { handled: false } }); window.dispatchEvent(ev); return ev.detail.handled; };
  const exportCsv = () => {
    const tb = document.querySelector('.fmain table'); if (!tb) return;
    const rows = [...tb.querySelectorAll('tr')].map(tr => [...tr.children].map(c => '"' + c.innerText.replace(/\s+/g, ' ').trim().replace(/"/g, '""') + '"').join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.join('\n')], { type: 'text/csv' })); a.download = 'maxx-report.csv'; a.click();
  };
  useEffect(() => {
    const atGate = path === '/dashboard' || path === '/books', inVoucher = path.startsWith('/books/voucher') || path.startsWith('/books/edit');
    const h = e => {
      let k = e.key.length === 1 ? e.key.toUpperCase() : e.key; if (k === ' ') k = 'Space';
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(k)) return;
      const combo = [(e.ctrlKey || e.metaKey) && 'Ctrl', e.altKey && 'Alt', e.shiftKey && k.length > 1 && 'Shift', k].filter(Boolean).join('+');
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      const plain = !e.ctrlKey && !e.altKey && !e.metaKey, stop = () => e.preventDefault();
      const to = map[combo];                                          // 1. menu shortcuts
      if (to) {
        if (plain && !/^F\d+$/.test(k) && typing) return;            // plain letters never steal typing
        if (/^Ctrl\+[A-Z]$/.test(combo) && path !== '/girvi') return; // Ctrl+C/Z/S/P only on the loan list
        if (combo === 'Ctrl+C' && String(window.getSelection())) return;
        if (e.shiftKey && combo === 'B') return;
        stop(); go(to); return;
      }
      switch (combo) {                                                // 2. Tally system keys
        case 'Ctrl+A': { const form = document.querySelector('.fmain form'); if (form) { stop(); form.requestSubmit(); } else if (fire('accept')) stop(); return; }
        case 'Ctrl+Q': stop(); r.back(); return;
        case 'Ctrl+N': case 'Alt+N': stop(); setCalc(c => !c); return;
        case 'F1': case 'F3': if (atGate) { stop(); go('/companies'); } return;
        case 'Alt+F1': if (atGate) { stop(); many ? go('/companies') : supabase.auth.signOut().then(() => r.push('/')); } else if (fire('detail')) stop(); return;
        case 'Alt+F3': if (atGate) { stop(); go('/books/company'); } return;
        case 'F2': case 'Alt+F2': { const d = document.querySelector('.fmain input[type=date]'); if (d) { stop(); d.focus(); } return; }
        case 'F11': if (!map.F11) { stop(); go('/books/company'); } return;
        case 'Alt+C': if (inVoucher) { stop(); window.open('/books/ledgers#create', '_blank'); } return;
        case 'Alt+A': case 'Alt+I': if (path === '/books/daybook') { stop(); go('/books/voucher/payment'); } return;
        case 'Alt+2': if (fire('duplicate')) stop(); return;
        case 'Alt+D': if (fire('deleteItem')) stop(); return;
        case 'Ctrl+R': if (inVoucher && fire('repeatNarr')) stop(); return;
        case 'PageUp': if (!typing && fire('prev')) stop(); return;
        case 'PageDown': if (!typing && fire('next')) stop(); return;
        case 'Shift+Enter': if (!typing && fire('detail')) stop(); return;
        case 'Ctrl+Space': if (fire('selectall')) stop(); return;
        case 'Alt+F12': { const el = document.querySelector('.fmain [data-filter]'); if (el) { stop(); el.focus(); } return; }
        case 'Alt+P': stop(); if (!fire('print')) window.print(); return;
        case 'Alt+E': stop(); exportCsv(); return;
      }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [st, path, many]);

  const showFly = (e, item) => {
    clearTimeout(timer.current); const rc = e.currentTarget.getBoundingClientRect(), mob = window.innerWidth < 900, h = item.sub.length * 40 + 50;
    setFly({ item, left: mob ? rc.left + 20 : rc.right - 6, top: Math.max(56, Math.min(mob ? rc.bottom : rc.top, window.innerHeight - h - 8)), w: mob ? Math.min(280, window.innerWidth - 40) : 300 });
  };
  const hideFly = () => { timer.current = setTimeout(() => setFly(null), 180); };
  const kb = k => k && <span className="kb">{k}</span>;
  const row = i => i.sub
    ? <button key={i.k} className="di" onMouseEnter={e => showFly(e, i)} onMouseLeave={hideFly} onClick={e => showFly(e, i)}><span>{t(i.k)}</span><span aria-hidden="true">›</span></button>
    : hrefOf(i, st) ? <button key={i.k} className={'di' + (path === hrefOf(i, st).split('#')[0] ? ' on' : '')} onClick={() => go(hrefOf(i, st))}><span>{t(i.k)}</span>{kb(i.key)}</button>
    : <span key={i.k} className="di off"><span>{t(i.k)} <small>({t('soon')})</small></span>{kb(i.key)}</span>;

  return (<div className="frame">
    <div className="ftop"><div className="fbar">
      <button className="burger ghost" aria-label="Menu" onClick={() => setOpen(!open)}>☰</button>
      <b className="fname">{tn?.name || t('app')}</b>
      <div className="wel">{me && <><span className="av">{me.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}</span><span className="wt">{t('welcome')}, <b>{me}</b>{role && <span className="role"> · {t('role_' + role)}</span>}</span></>}</div>
      {many && <button className="ghost" onClick={() => r.push('/companies')}>{t('companies')}</button>}
      <div style={{ position: 'relative' }}>
        <button className="ghost" aria-label={t('moreMenu')} aria-expanded={menu} onClick={() => setMenu(!menu)}>⋮</button>
        {menu && <div className="scrim" style={{ background: 'transparent' }} onClick={() => setMenu(false)} />}
        {menu && <div className="topmenu" onMouseLeave={() => setMenu(false)}>
          <button onClick={() => { setCalc(c => !c); setMenu(false); }}>{t('calculator')}</button>
          <button onClick={() => { toggle(); setMenu(false); }}>{t('lang')}</button>
          <button className="danger" onClick={async () => { await supabase.auth.signOut(); r.push('/'); }}>{t('signOut')}</button>
        </div>}
      </div>
    </div>
    {['jewellery', 'girvi_loan'].includes(st) && <RateStrip />}</div>
    <div className="fbody">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <nav className={'drawer' + (open ? ' open' : '')}>
        <Link href="/dashboard" className={'di top' + (path === '/dashboard' ? ' on' : '')}><Ico k="home" /><span style={{ flex: 1 }}>{t('home')}</span></Link>
        {groups.map(g => <div key={g.k}>
          <button className="dg" aria-expanded={!!openG[g.k]} onClick={() => setOpenG({ ...openG, [g.k]: !openG[g.k] })}><Ico k={g.k} /><span style={{ flex: 1 }}>{t(g.k)}</span><Chev up={openG[g.k]} /></button>
          {openG[g.k] && g.items.map(row)}</div>)}
      </nav>
      <main className="fmain">{children}</main>
    </div>
    {calc && <Calc onClose={() => setCalc(false)} />}
    {fly && <div className="fly" style={{ left: fly.left, top: fly.top, width: fly.w }} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hideFly}>
      <div className="hd">{t(fly.item.k)}</div>
      {fly.item.sub.map(s => { const h = hrefOf(s, st); return h
        ? <button key={s.k} className={s.danger ? 'del' : ''} onClick={() => go(h)}><span>{t(s.k)}</span>{kb(s.key)}</button>
        : <button key={s.k} className="off" disabled><span>{t(s.k)} <small>({t('soon')})</small></span>{kb(s.key)}</button>; })}
    </div>}
  </div>);
}
