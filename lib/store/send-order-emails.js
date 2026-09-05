import { Resend } from 'resend';
import { nis } from './format';

const apiKey = process.env.RESEND_API_KEY;
// resend.dev's shared sender works without verifying a domain — fine to start
// with, swap in your own once a domain is verified in Resend.
const fromEmail = process.env.ORDER_FROM_EMAIL || 'AM Clothing <onboarding@resend.dev>';
const ownerEmail = process.env.ORDER_NOTIFICATION_EMAIL;

export const isResendConfigured = Boolean(apiKey);

function orderHtml(order) {
  const itemsHtml = order.order_items
    .map((it) => `<li>${it.title} · מידה ${it.size} · ${it.quantity} יח׳ · ${nis(it.unit_price * it.quantity)}</li>`)
    .join('');

  return `
    <div dir="rtl" style="font-family: Assistant, Arial, sans-serif; color: #0a0a0b;">
      <h2 style="font-weight: 400;">תודה על ההזמנה!</h2>
      <p>ההזמנה שלכם ב-AM Clothing התקבלה ואושרה.</p>
      <ul>${itemsHtml}</ul>
      <p><strong>סה״כ: ${nis(order.total)}</strong></p>
      <p style="color: #9d968b; font-size: 0.85em;">מספר הזמנה: ${order.id}</p>
    </div>
  `;
}

// Email is a nice-to-have on top of a paid order, never the thing that decides
// whether the order is valid — callers should swallow errors from this (the
// Stripe webhook already does) rather than let a failed send undo a payment.
export async function sendOrderConfirmationEmails(order) {
  if (!isResendConfigured) return;

  const resend = new Resend(apiKey);
  const html = orderHtml(order);

  if (order.customer_email) {
    await resend.emails.send({
      from: fromEmail,
      to: order.customer_email,
      subject: 'אישור הזמנה — AM Clothing',
      html
    });
  }

  if (ownerEmail) {
    await resend.emails.send({
      from: fromEmail,
      to: ownerEmail,
      subject: `הזמנה חדשה · ${nis(order.total)}`,
      html: `${html}<p>לקוח/ה: ${order.customer_email || 'אורח'}</p>`
    });
  }
}
