// Server-side helpers for password reset codes (used only by app/api/auth/*)
import crypto from 'crypto';
export const hashOtp = (key, otp) => crypto.createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev').update(key + ':' + otp).digest('hex');
export const sameHash = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
