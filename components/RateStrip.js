'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useT } from '../lib/i18n';
const inr = v => Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 });
function Cell({ title, r, dir }) {
  const diff = r && r.close > 0 ? r.ltp - r.close : 0, pct = r && r.close > 0 ? diff / r.close * 100 : 0, sg = diff > 0 ? '+' : '';
  const col = diff > 0 ? '#059669' : diff < 0 ? '#dc2626' : '#64748b', tick = dir > 0 ? '#059669' : dir < 0 ? '#dc2626' : '#b45309';
  return (<div className="rcell"><div className="rt">{title}</div>
    <div className="rv" style={{ color: tick }}>{r ? '₹ ' + inr(r.ltp) : '₹ --,--'} <small>{dir > 0 ? '▲' : dir < 0 ? '▼' : ''}</small></div>
    {r && <><div className="rc" style={{ color: col }}>{sg}₹{inr(diff)} ({sg}{pct.toFixed(2)}%)</div>
      <div className="rs">H: {inr(r.high)} | L: {inr(r.low)} | Prev: {inr(r.close)}</div></>}</div>);
}
export default function RateStrip() {
  const { t } = useT(); const [d, setD] = useState(null); const prev = useRef({}), dir = useRef({});
  useEffect(() => {
    let on = true, timer;
    const tick = async () => {
      let out = { status: 'offline' };
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/rates', { headers: { Authorization: 'Bearer ' + (session?.access_token || '') } });
        if (res.ok) out = await res.json();
      } catch {}
      ['gold', 'silver'].forEach(k => { const r = out[k]; if (!r) return; const p = prev.current[k]; if (p !== undefined && r.ltp !== p) dir.current[k] = r.ltp > p ? 1 : -1; prev.current[k] = r.ltp; });
      if (out.gold || out.silver) { try { localStorage.setItem('liveRates', JSON.stringify({ gold: out.gold?.ltp, silver: out.silver?.ltp })); } catch {} }
      if (on) { setD({ ...out, dir: { ...dir.current } }); timer = setTimeout(tick, 5000); }
    };
    tick(); return () => { on = false; clearTimeout(timer); };
  }, []);
  const live = d?.status === 'live';
  return (<div className="rbar">
    <div className="rcell" style={{ flex: '0 0 auto' }}><b style={{ color: d ? (live ? '#059669' : '#dc2626') : '#64748b' }}>⚡ {!d ? t('connecting') : live ? t('mcxLive') : t('offline')}</b></div>
    <Cell title={`${t('gold').toUpperCase()} (10g) 995`} r={d?.gold} dir={d?.dir?.gold} />
    <Cell title={`${t('silver').toUpperCase()} (1kg)`} r={d?.silver} dir={d?.dir?.silver} />
  </div>);
}
