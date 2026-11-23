import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
// Login id: tenant code + mobile -> internal email. Super admin uses a normal email.
export const toEmail = (code, mobile) => `${code.toLowerCase()}.${mobile}@maxxerp.app`;
