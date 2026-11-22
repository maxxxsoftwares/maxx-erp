import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import * as signalR from '@microsoft/signalr';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The browser cannot call the hub directly (plain http + CORS), so the server keeps one
// SignalR connection open, caches the latest GOLD/SILVER ticks, and the app polls this route.
const HUB = process.env.MCX_HUB_URL || 'http://129.225.86.148/mcxHub';
const S = (globalThis.__mcx ||= { conn: null, rates: {}, starting: null });
const pick = (r, k) => r[k] ?? r[k[0].toUpperCase() + k.slice(1)];

async function ensure() {
  if (S.conn && S.conn.state === signalR.HubConnectionState.Connected) return;
  if (S.starting) return S.starting;
  S.starting = (async () => {
    try { if (S.conn) await S.conn.stop(); } catch {}
    const c = new signalR.HubConnectionBuilder().withUrl(HUB).withAutomaticReconnect([0, 2000, 5000, 10000]).build();
    c.on('ReceiveRateUpdate', r => {
      if (!r) return; const sym = String(pick(r, 'symbol') || '').toUpperCase(); if (!sym) return;
      S.rates[sym] = { ltp: +pick(r, 'ltp') || 0, high: +pick(r, 'high') || 0, low: +pick(r, 'low') || 0, close: +pick(r, 'close') || 0, updatedAt: pick(r, 'updatedAt') || new Date().toISOString() };
    });
    await c.start(); S.conn = c;
  })().finally(() => { S.starting = null; });
  return S.starting;
}

export async function GET(req) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await ensure();
    for (let i = 0; i < 12 && !S.rates.GOLD && !S.rates.SILVER; i++) await new Promise(r => setTimeout(r, 500)); // wait for first ticks
    return NextResponse.json({ status: 'live', gold: S.rates.GOLD || null, silver: S.rates.SILVER || null });
  } catch (e) {
    return NextResponse.json({ status: 'offline', error: String(e.message || e), gold: S.rates.GOLD || null, silver: S.rates.SILVER || null });
  }
}
