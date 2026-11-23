// Server-only: sending email through Gmail SMTP (smtp.gmail.com:587, STARTTLS), like the desktop software
import nodemailer from 'nodemailer';
import { decrypt } from './whatsapp';
export const rowToEmailCfg = r => r?.sender_email && r.app_password ? { user: r.sender_email, pass: decrypt(r.app_password), name: r.from_name || '' } : null;
export async function loadEmailConfig(db, tenantId) {
  const { data } = await db.from('email_settings').select('*').eq('tenant_id', tenantId).maybeSingle();
  return data?.enabled ? rowToEmailCfg(data) : null;
}
export async function sendEmail(cfg, to, subject, html, attachments = []) {
  if (!cfg) {
    if (process.env.NODE_ENV !== 'production') { console.log(`\n[DEV] Email is not configured. Mail to ${to}: ${subject}\n`); return; }
    throw new Error('Email is not configured');
  }
  const tr = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: { user: cfg.user, pass: cfg.pass } });
  await tr.sendMail({ from: cfg.name ? `"${cfg.name.replace(/"/g, '')}" <${cfg.user}>` : cfg.user, to, subject, html, attachments });
}
