import { isManager } from '../lib/auth';
import { listDeliveries, STATUS, STATUS_LABEL } from '../lib/store';
import { formatDateTime } from '../lib/format';

// עטיפת ערך לפורמט CSV תקין (בריחה ממרכאות ופסיקים)
function csvCell(value) {
    const str = value == null ? '' : String(value);
    return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(request) {
    if (!(await isManager())) {
        return new Response('אין הרשאה', { status: 401 });
    }

    // אפשר לסנן את הדוח לפי סטטוס דרך ?status=...
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const validStatuses = [STATUS.AVAILABLE, STATUS.PICKED, STATUS.DELIVERED, STATUS.CANCELLED];

    let deliveries = await listDeliveries();
    if (validStatuses.includes(status)) {
        deliveries = deliveries.filter((d) => d.status === status);
    }

    const headers = [
        'תאריך יצירה',
        'כתובת',
        'טלפון לקוח',
        'תשלום לשליח (₪)',
        'סטטוס',
        'שליח',
        'נלקח',
        'נמסר',
        'בוטל',
        'הערות'
    ];

    const rows = deliveries.map((d) => [
        formatDateTime(d.createdAt),
        d.address,
        d.phone,
        d.payment,
        STATUS_LABEL[d.status] || d.status,
        d.courierName,
        formatDateTime(d.pickedAt),
        formatDateTime(d.deliveredAt),
        formatDateTime(d.cancelledAt),
        d.notes
    ]);

    // שורת סיכום: סך התשלומים על משלוחים שנמסרו
    const totalPaid = deliveries
        .filter((d) => d.status === STATUS.DELIVERED)
        .reduce((sum, d) => sum + (Number(d.payment) || 0), 0);
    const summaryRow = ['', '', 'סה"כ שולם (נמסרו):', totalPaid, '', '', '', '', '', ''];

    const lines = [headers, ...rows, [], summaryRow].map((row) => row.map(csvCell).join(','));

    // BOM כדי שאקסל יזהה UTF-8 ויציג עברית כראוי
    const csv = '﻿' + lines.join('\r\n');

    const date = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="deliveries-report-${date}.csv"`
        }
    });
}
