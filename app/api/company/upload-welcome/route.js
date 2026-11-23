import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const OK_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function POST(req) {
  const db = admin();
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: p } = await db.from('profiles').select('tenant_id, role').eq('id', user.id).maybeSingle();
  if (!p?.tenant_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (p.role !== 'owner') return NextResponse.json({ error: 'Only the owner can change the welcome image' }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file received' }, { status: 400 });
  if (!OK_TYPES.includes(file.type)) return NextResponse.json({ error: 'Use a PNG, JPEG, WEBP or GIF image' }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'The image must be under 5 MB' }, { status: 400 });

  const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
  const path = `welcome/${p.tenant_id}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await db.storage.from('public-assets').upload(path, bytes, { contentType: file.type, upsert: true });
  if (upErr) return NextResponse.json({ error: `Could not upload the image: ${upErr.message}. Run supabase/company_welcome.sql first.` }, { status: 400 });
  const { data: pub } = db.storage.from('public-assets').getPublicUrl(path);
  const { error } = await db.from('company_profile').upsert({ tenant_id: p.tenant_id, welcome_image_url: pub.publicUrl });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, url: pub.publicUrl });
}
