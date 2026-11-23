import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as signalR from '@microsoft/signalr';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const HUB = process.env.MCX_HUB_URL || 'http://129.225.86.148/mcxHub';
const SERVERLESS = !!process.env.VERCEL;          // Vercel cannot keep a connection open between requests
const TTL = 8000;                                  // serverless: reuse the saved ticks for 8 s
const pick = (r, k) => r[k] ?? r[k[0].toUpperCase() + k.slice(1)];
const norm = r => {
  if (!r) return null; const symbol = String(pick(r, 'symbol') || '').toUpperCase(); if (!symbol) return null;
  return { symbol, ltp: +pick(r, 'ltp') || 0, high: +pick(r, 'high') || 0, low: +pick(r, 'low') || 0, close: +pick(r, 'close') || 0, updated_at: pick(r, 'updatedAt') || new Date().toISOString() };
};
const out = (rows, extra = {}) => {
  const by = Object.fromEntries((rows || []).map(x => [x.symbol, { ltp: +x.ltp, high: +x.high, low: +x.low, close: +x.close, updatedAt: x.updated_at }]));
  return { gold: by.GOLD || null, silver: by.SILVER || null, ...extra };
};

// ---- local / own server: one connection kept open, ticks arrive live ----
const S = (globalThis.__mcx ||= { conn: null, rates: {}, starting: null });
async function ensure() {
  if (S.conn && S.conn.state === signalR.HubConnectionState.Connected) return;
  if (S.starting) return S.starting;
  S.starting = (async () => {
    try { if (S.conn) await S.conn.stop(); } catch {}
    const c = new signalR.HubConnectionBuilder().withUrl(HUB).withAutomaticReconnect([0, 2000, 5000, 10000]).build();
    c.on('ReceiveRateUpdate', r => { const x = norm(r); if (x) S.rates[x.symbol] = x; });
    await c.start(); S.conn = c;
  })().finally(() => { S.starting = null; });
  return S.starting;
}

// ---- Vercel: connect for a few seconds, take the latest ticks, save them, disconnect ----
async function collect(ms = 8000) {
  const got = {};
  const c = new signalR.HubConnectionBuilder().withUrl(HUB).build();
  c.on('ReceiveRateUpdate', r => { const x = norm(r); if (x) got[x.symbol] = x; });
  try {
    await Promise.race([c.start(), new Promise((_, rej) => setTimeout(() => rej(new Error('Could not connect to the MCX hub')), ms))]);
    const t0 = Date.now();
    while (!(got.GOLD && got.SILVER) && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 200));
  } finally { try { await c.stop(); } catch {} }
  return got;
}

export async function GET(req) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!SERVERLESS) {
    try {
      await ensure();
      for (let i = 0; i < 12 && !S.rates.GOLD && !S.rates.SILVER; i++) await new Promise(r => setTimeout(r, 500));
      return NextResponse.json(out(Object.values(S.rates), { status: 'live' }));
    } catch (e) { return NextResponse.json(out(Object.values(S.rates), { status: 'offline', error: String(e.message || e) })); }
  }

  let rows = [], err = '';
  try { const r = await db.from('mcx_rates').select('*'); rows = r.data || []; } catch {}
  const newest = rows.reduce((m, x) => Math.max(m, +new Date(x.fetched_at)), 0);
  if (!rows.length || Date.now() - newest > TTL) {
    try {
      const got = await collect(8000), fresh = Object.values(got).map(x => ({ ...x, fetched_at: new Date().toISOString() }));
      if (fresh.length) {
        const merged = { ...Object.fromEntries(rows.map(x => [x.symbol, x])), ...Object.fromEntries(fresh.map(x => [x.symbol, x])) };
        rows = Object.values(merged);
        try { await db.from('mcx_rates').upsert(fresh); } catch {}          // table missing: still answer, just without saving
      } else err = 'No price arrived from the hub yet';
    } catch (e) { err = String(e.message || e); }
  }
  const age = rows.length ? Math.round((Date.now() - rows.reduce((m, x) => Math.max(m, +new Date(x.fetched_at || 0)), 0)) / 1000) : null;
  return NextResponse.json(out(rows, { status: !rows.length ? 'offline' : age < 120 ? 'live' : 'stale', error: err || undefined, ageSec: age }));
}
