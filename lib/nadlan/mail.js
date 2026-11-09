// Matzpen's emails, sent through Resend like the rest of the site.
//
// Settings (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY        – from resend.com → API Keys
//   MATZPEN_EMAIL_FROM    – sender, e.g. "מצפן נדל״ן <alerts@your-domain.co.il>"
//                           (falls back to EMAIL_FROM). The domain must be
//                           verified in Resend.

export const mailFrom = () => process.env.MATZPEN_EMAIL_FROM || process.env.EMAIL_FROM;
export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY && mailFrom());

// The site's public address, for links in emails. Netlify sets URL.
export const siteUrl = () => (process.env.URL || process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const escapeHtml = (text) =>
    String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function sendMail({ to, subject, html, text }, { fetchImpl = fetch } = {}) {
    if (!mailConfigured()) throw new Error('Email not configured: RESEND_API_KEY / MATZPEN_EMAIL_FROM missing');
    const res = await fetchImpl(`${process.env.RESEND_API_URL || 'https://api.resend.com'}/emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: mailFrom(), to: [to], subject, html, text })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(`Resend: ${data.message || res.status}`);
    }
}

// One layout for every Matzpen email. `blocks` are trusted HTML strings
// built with escapeHtml by the callers below.
function layout({ title, blocks, button, footer }) {
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he"><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;text-align:right">
  <div style="color:#4f46e5;font-weight:bold;font-size:15px;margin-bottom:10px">🧭 מצפן נדל״ן</div>
  <h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>
  ${blocks.join('\n  ')}
  ${button ? `<p style="margin:24px 0"><a href="${escapeHtml(button.href)}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">${escapeHtml(button.label)}</a></p>` : ''}
  <p style="font-size:12px;color:#64748b;margin-top:28px;line-height:1.6">${footer}</p>
</div></body></html>`;
    return html;
}

const p = (text) => `<p style="font-size:15px;line-height:1.6;margin:0 0 10px">${escapeHtml(text)}</p>`;

export function confirmEmail({ confirmUrl, areaNames }) {
    const subject = 'אישור הרשמה להתראות ממצפן נדל״ן';
    const what = areaNames.length ? `נעדכן אותך על: ${areaNames.join(', ')}.` : '';
    return {
        subject,
        html: layout({
            title: 'עוד צעד אחד',
            blocks: [p('ביקשת לקבל התראות כשהציון של שכונה משתנה וכשעולות בה דירות חדשות למכירה.'), p(what)],
            button: { href: confirmUrl, label: 'אישור ההרשמה' },
            footer: 'לא ביקשת? אפשר להתעלם מהמייל הזה, ולא נשלח לך כלום.'
        }),
        text: `ביקשת לקבל התראות ממצפן נדל״ן. ${what}\nלאישור: ${confirmUrl}\nלא ביקשת? אפשר להתעלם.`
    };
}

const footerFor = (unsubscribeUrl) =>
    `קיבלת את המייל כי ביקשת התראות על השכונות האלה. המידע אינו ייעוץ השקעות. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b">הסרה מההתראות</a>`;

export function scoreChangeEmail({ changes, unsubscribeUrl, base }) {
    const rows = changes.map((c) => {
        const up = c.to > c.from;
        return `<p style="font-size:15px;margin:0 0 10px"><a href="${escapeHtml(`${base}/matzpen/area/${c.areaId}`)}" style="color:#0f172a;font-weight:bold">${escapeHtml(`${c.name}, ${c.cityName}`)}</a>: ${up ? '📈' : '📉'} הציון ${up ? 'עלה' : 'ירד'} מ-${c.from} ל-<b>${c.to}</b>${c.trendTo !== c.trendFrom ? ` (${escapeHtml(c.trendTo)})` : ''}</p>`;
    });
    return {
        subject: changes.length === 1 ? `עדכון ב${changes[0].name}: הציון ${changes[0].to > changes[0].from ? 'עלה' : 'ירד'}` : `עדכון ב-${changes.length} שכונות שאתם עוקבים אחריהן`,
        html: layout({ title: 'שינוי בשכונות שלך', blocks: rows, button: { href: `${base}/matzpen/ranking`, label: 'לדירוג המלא' }, footer: footerFor(unsubscribeUrl) }),
        text: `${changes.map((c) => `${c.name}, ${c.cityName}: ${c.from} → ${c.to}`).join('\n')}\nהסרה: ${unsubscribeUrl}`
    };
}

export function newListingEmail({ listing, priceText, unsubscribeUrl, base }) {
    const url = `${base}/matzpen/listings/${listing.id}`;
    const line = `${listing.rooms} חדרים, ${listing.sqm} מ״ר, ${priceText}`;
    return {
        subject: `דירה חדשה למכירה ב${listing.areaName}`,
        html: layout({
            title: `דירה חדשה ב${listing.areaName}, ${listing.cityName}`,
            blocks: [p(line), listing.street ? p(`רחוב ${listing.street}`) : ''],
            button: { href: url, label: 'לדירה' },
            footer: footerFor(unsubscribeUrl)
        }),
        text: `דירה חדשה ב${listing.areaName}, ${listing.cityName}: ${line}\n${url}\nהסרה: ${unsubscribeUrl}`
    };
}
