'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabase';
export const n2 = v => Math.round((+v || 0) * 100) / 100;
export const r3 = v => Math.round((+v || 0) * 1000) / 1000;
export const money = v => n2(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const today = () => new Date().toISOString().slice(0, 10);
export function useBooks() {
  const r = useRouter();
  const [s, setS] = useState({ ready: false, tenant: null, ledgers: [], groups: [] });
  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return r.replace('/');
    const { data: p } = await supabase.from('profiles').select('tenants(id,name,gold_trade,silver_trade,status)').eq('id', user.id).single();
    if (!p?.tenants) return r.replace('/');
    const [l, g] = await Promise.all([
      supabase.from('ledgers').select('id,name,metal,opening,opening_type,group_id,gstin,account_groups(name)').order('name'),
      supabase.from('account_groups').select('id,name,nature,parent_id,is_default').order('name')]);
    setS({ ready: true, tenant: p.tenants, ledgers: l.data || [], groups: g.data || [] });
  };
  useEffect(() => { load(); }, []);
  return { ...s, reload: load };
}
export function useTenant() {
  const r = useRouter(); const [s, setS] = useState({ ready: false, tenant: null });
  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return r.replace('/');
    const { data: p } = await supabase.from('profiles').select('tenants(id,name,setup_type)').eq('id', user.id).single();
    if (!p?.tenants) return r.replace('/'); setS({ ready: true, tenant: p.tenants });
  })(); }, []);
  return s;
}
export function useHash() {
  const [h, setH] = useState('');
  useEffect(() => { const f = () => setH(window.location.hash.slice(1)); f(); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return h;
}
