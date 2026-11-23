// Server-only: who is calling a settings API. Only the owner or a manager of the active business may.
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
export const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export async function who(req) {
  const db = admin(), token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token); if (!user) return { status: 401 };
  const { data: p } = await db.from('profiles').select('tenant_id, role, name, tenants(name)').eq('id', user.id).maybeSingle();
  if (!p?.tenant_id) return { status: 401 };
  if (!['owner', 'manager'].includes(p.role)) return { status: 403 };
  return { db, tenant: p.tenant_id, name: p.tenants?.name || '' };
}
export const deny = w => NextResponse.json({ error: w.status === 403 ? 'Only the owner or a manager can change these settings' : 'Unauthorized' }, { status: w.status });
