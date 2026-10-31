// Sends the program to the buyer by email through Resend (resend.com).
//
// Settings (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY – from resend.com → API Keys
//   EMAIL_FROM     – sender, e.g. "כושר בבית <program@your-domain.co.il>".
//                    The domain must be verified in Resend. Until then
//                    "onboarding@resend.dev" works, but only to your own address.

import { offer } from './offer-config.js';

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function programEmail({ name, plan, siteUrl }) {
    const link = new URL(plan.accessUrl, siteUrl).toString();
    const firstName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || '');
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he"><body style="margin:0;background:#fff7ed;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;text-align:right">
  <div style="color:#ea580c;font-weight:bold;font-size:14px;margin-bottom:8px">${escapeHtml(offer.brand)}</div>
  <h1 style="font-size:24px;margin:0 0 16px">${firstName ? `היי ${firstName},` : 'היי,'}</h1>
  <p style="font-size:16px;line-height:1.6;margin:0 0 8px">${escapeHtml(offer.email.intro)}</p>
  <p style="font-size:16px;margin:0 0 24px"><strong>${escapeHtml(plan.name)}</strong></p>
  <a href="${escapeHtml(link)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:bold;font-size:18px;padding:14px 28px;border-radius:999px">לתוכנית שלי</a>
  <p style="font-size:13px;color:#64748b;margin:16px 0 24px;direction:ltr;text-align:right">${escapeHtml(link)}</p>
  <p style="font-size:15px;line-height:1.6;margin:0">${escapeHtml(offer.email.outro)}</p>
</div></body></html>`;
    const text = `${firstName ? `היי ${firstName},` : 'היי,'}\n\n${offer.email.intro}\n${plan.name}\n${link}\n\n${offer.email.outro}`;
    return { subject: offer.email.subject, html, text };
}

export function mailerConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendProgramEmail({ to, name, plan, siteUrl }) {
    if (!mailerConfigured()) throw new Error('Email not configured: RESEND_API_KEY / EMAIL_FROM missing');
    const { subject, html, text } = programEmail({ name, plan, siteUrl });
    const res = await fetch(`${process.env.RESEND_API_URL || 'https://api.resend.com'}/emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: process.env.EMAIL_FROM,
            to: [to],
            subject,
            html,
            text,
            ...(offer.email.replyTo ? { reply_to: offer.email.replyTo } : {})
        })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(`Resend: ${data.message || res.status}`);
    }
}
