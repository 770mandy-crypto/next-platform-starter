// Emails finished work (a worksheet or a presentation) to the person the
// meeting's owner named for it. Sent through Resend, with the same settings
// as the rest of the site: RESEND_API_KEY and EMAIL_FROM.

const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function isMailConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export const isEmail = (value) => typeof value === 'string' && /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/.test(value) && value.length <= 200;

// `paragraphs` is the work itself as plain lines, so it can be read in the
// email without opening the link.
export function workEmail({ meeting, kind, title, url, paragraphs }) {
    const hebrew = meeting.language === 'he';
    const kindName = hebrew ? (kind === 'worksheet' ? 'דף העבודה' : 'המצגת') : kind === 'worksheet' ? 'the worksheet' : 'the presentation';
    const greeting = hebrew
        ? `שלום${meeting.recipientName ? ` ${meeting.recipientName}` : ''},`
        : `Hello${meeting.recipientName ? ` ${meeting.recipientName}` : ''},`;
    const lead = hebrew
        ? `מצורף ${kindName} שהתבקש בפגישה: "${title}".`
        : `Here is ${kindName} that was asked for in the meeting: "${title}".`;
    const signature = hebrew
        ? `נשלח על ידי ${meeting.botName}, עוזר ה-AI של ${meeting.ownerName || 'בעל הפגישה'}. התוכן נכתב על ידי בינה מלאכותית, כדאי לעבור עליו לפני שימוש.`
        : `Sent by ${meeting.botName}, the AI assistant of ${meeting.ownerName || 'the meeting owner'}. The content was written by AI; please review it before use.`;
    const open = hebrew ? 'לפתיחה ולהדפסה' : 'Open and print';
    const direction = hebrew ? 'rtl' : 'ltr';
    const align = hebrew ? 'right' : 'left';

    const html = `<!DOCTYPE html>
<html dir="${direction}" lang="${hebrew ? 'he' : 'en'}"><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<div style="max-width:600px;margin:0 auto;padding:32px 20px;text-align:${align}">
  <p style="font-size:16px;margin:0 0 12px">${escapeHtml(greeting)}</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 20px">${escapeHtml(lead)}</p>
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;font-weight:bold;font-size:16px;padding:12px 24px;border-radius:10px">${open}</a>
  <p style="font-size:13px;color:#64748b;margin:12px 0 24px;direction:ltr;text-align:${align}">${escapeHtml(url)}</p>
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:20px">
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
    ${paragraphs.map((line) => `<p style="font-size:15px;line-height:1.7;margin:0 0 10px;white-space:pre-wrap">${escapeHtml(line)}</p>`).join('\n    ')}
  </div>
  <p style="font-size:12px;color:#64748b;line-height:1.6;margin:20px 0 0">${escapeHtml(signature)}</p>
</div></body></html>`;
    const text = `${greeting}\n\n${lead}\n${url}\n\n${title}\n\n${paragraphs.join('\n\n')}\n\n${signature}`;
    return { subject: title, html, text };
}

export async function sendWorkEmail({ meeting, kind, title, url, paragraphs }) {
    if (!isMailConfigured()) throw new Error('Email is not configured: RESEND_API_KEY / EMAIL_FROM missing');
    const { subject, html, text } = workEmail({ meeting, kind, title, url, paragraphs });
    let response;
    try {
        response = await fetch(`${(process.env.RESEND_API_URL || 'https://api.resend.com').replace(/\/$/, '')}/emails`, {
            method: 'POST',
            headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
            body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [meeting.recipientEmail], subject, html, text }),
            signal: AbortSignal.timeout(20_000)
        });
    } catch (error) {
        throw new Error(`Email service did not answer: ${error?.message ?? 'unknown'}`);
    }
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(`Email was refused (${response.status}): ${String(data.message ?? '').slice(0, 200)}`);
    }
}
