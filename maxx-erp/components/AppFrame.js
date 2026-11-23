'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';
import { menuFor, hrefOf } from '../lib/menu';

export default function AppFrame({ children }) {
  const { t, toggle } = useT(); const r = useRouter(); const path = usePathname();
  const [tn, setTn] = useState(null); const [many, setMany] = useState(false); const [open, setOpen] = useState(false);
  const [shut, setShut] = useState({}); const [fly, setFly] = useState(null); const timer = useRef();
  const [userProfile, setUserProfile] = useState(null);
  const st = tn?.setup_type, groups = st ? menuFor(st) : [];
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return r.replace('/');
    const { data } = await supabase.from('profiles').select('name, role, tenants(name,setup_type)').eq('id', user.id).single();
    if (!data?.tenants) return r.replace('/'); setTn(data.tenants); setUserProfile(data);
    const { count } = await supabase.from('user_tenants').select('tenant_id', { count: 'exact', head: true }); setMany((count || 0) > 1);
  })(); }, []);
  useEffect(() => { setOpen(false); setFly(null); }, [path]);
  const go = h => { setFly(null); setOpen(false); r.push(h); setTimeout(() => window.dispatchEvent(new HashChangeEvent('hashchange')), 120); };

  // Keyboard shortcuts for the items this setup can see
  const map = {};
  groups.forEach(g => g.items.forEach(i => { if (i.key && hrefOf(i, st)) map[i.key] = hrefOf(i, st); (i.sub || []).forEach(s => { if (s.key && hrefOf(s, st)) map[s.key] = hrefOf(s, st); }); }));
  useEffect(() => {
    const h = e => {
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key; if (['Control', 'Alt', 'Shift', 'Meta'].includes(k)) return;
      const combo = [(e.ctrlKey || e.metaKey) && 'Ctrl', e.altKey && 'Alt', k].filter(Boolean).join('+'); const to = map[combo]; if (!to) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
      if (!/^F\d+$/.test(k) && typing) return;                       // letters and Ctrl keys never steal typing
      if (combo.startsWith('Ctrl') && path !== '/girvi') return;      // Ctrl+C/Z/S/P only on the loan list; keeps copy, undo, save, print elsewhere
      if (combo === 'Ctrl+C' && String(window.getSelection())) return;
      if (e.shiftKey && combo === 'B') return;
      e.preventDefault(); go(to);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [st, path]);

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

  const roleLabel = userProfile?.role === 'owner' ? t('roleAdmin') : userProfile?.role === 'manager' ? t('roleAdmin') : userProfile?.role === 'accountant' ? t('roleOperator') : userProfile?.role === 'salesman' ? t('roleUser') : t('roleUser');

  return (<div className="frame">
    <div className="fbar">
      <button className="burger ghost" aria-label="Menu" onClick={() => setOpen(!open)}>☰</button>
      <b className="fname">{tn?.name || t('app')}</b>
      {userProfile && <span className="welcome-user" style={{color:'#fff',fontSize:14,marginRight:12}}>{t('welcomeUser')}, {userProfile.name} <span className="role-badge" style={{background:'rgba(255,255,255,0.2)',padding:'2px 8px',borderRadius:12,fontSize:11,marginLeft:8}}>{roleLabel}</span></span>}
      {many && <button className="ghost" onClick={() => r.push('/companies')}>{t('companies')}</button>}
    </div>
    <div className="fbody">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <nav className={'drawer' + (open ? ' open' : '')}>
        <Link href="/dashboard" className={'di top' + (path === '/dashboard' ? ' on' : '')}>{t('home')}</Link>
        {groups.map(g => <div key={g.k}>
          <button className="dg" onClick={() => setShut({ ...shut, [g.k]: !shut[g.k] })}><span>{t(g.k)}</span><span>{shut[g.k] ? '+' : '−'}</span></button>
          {!shut[g.k] && g.items.map(row)}</div>)}
        <div style={{borderTop:'1px solid #244a41',marginTop:8,paddingTop:8}}>
          <button className="di" onClick={toggle}><span>{t('lang')}</span></button>
          <button className="di" onClick={async () => { await supabase.auth.signOut(); r.push('/'); }}><span>{t('signOut')}</span></button>
        </div>
      </nav>
      <main className="fmain">{children}</main>
    </div>
    {fly && <div className="fly" style={{ left: fly.left, top: fly.top, width: fly.w }} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hideFly}>
      <div className="hd">{t(fly.item.k)}</div>
      {fly.item.sub.map(s => { const h = hrefOf(s, st); return h
        ? <button key={s.k} className={s.danger ? 'del' : ''} onClick={() => go(h)}><span>{t(s.k)}</span>{kb(s.key)}</button>
        : <button key={s.k} className="off" disabled><span>{t(s.k)} <small>({t('soon')})</small></span>{kb(s.key)}</button>; })}
    </div>}
  </div>);
}