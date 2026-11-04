// Builds a right-to-left PowerPoint deck from the presentation agent's outline.
// The agent decides the content and the layout of each slide; this file owns
// the look, so every deck comes out consistent and readable in Hebrew.

import PptxGenJS from 'pptxgenjs';

export const THEMES = {
    midnight: { bg: '0F172A', panel: '1E293B', title: 'FFFFFF', text: 'CBD5E1', accent: '818CF8', soft: '334155' },
    ocean: { bg: 'F0F9FF', panel: 'FFFFFF', title: '0C4A6E', text: '1E293B', accent: '0284C7', soft: 'BAE6FD' },
    sunrise: { bg: 'FFF7ED', panel: 'FFFFFF', title: '7C2D12', text: '292524', accent: 'EA580C', soft: 'FED7AA' },
    clean: { bg: 'FFFFFF', panel: 'F8FAFC', title: '0F172A', text: '334155', accent: '4F46E5', soft: 'E2E8F0' }
};

export const LAYOUTS = ['bullets', 'section', 'two_column', 'quote', 'chart', 'stats'];

const FONT = 'Arial';
const W = 13.333;
const H = 7.5;
const M = 0.7;

const rtl = { align: 'right', rtlMode: true, fontFace: FONT };

function header(slide, theme, title, number) {
    slide.addShape('rect', { x: W - M - 0.12, y: 0.62, w: 0.12, h: 0.62, fill: { color: theme.accent } });
    slide.addText(title, {
        ...rtl,
        x: M,
        y: 0.5,
        w: W - 2 * M - 0.35,
        h: 0.85,
        fontSize: 30,
        bold: true,
        color: theme.title,
        valign: 'middle',
        fit: 'shrink'
    });
    slide.addText(String(number), {
        x: M,
        y: H - 0.55,
        w: 1,
        h: 0.35,
        fontFace: FONT,
        fontSize: 11,
        color: theme.text,
        align: 'left'
    });
}

function bulletRuns(items, theme, size = 20) {
    return items.map((item) => ({
        text: item,
        options: { bullet: { indent: 18 }, color: theme.text, fontSize: size, paraSpaceAfter: 10, breakLine: true }
    }));
}

const CHART_TYPES = { bar: 'bar', line: 'line', pie: 'pie', doughnut: 'doughnut' };

export async function buildDeck({ title, subtitle, theme: themeName = 'midnight', slides }) {
    const theme = THEMES[themeName] ?? THEMES.midnight;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.rtlMode = true;
    pptx.title = title;
    pptx.author = 'MENDI AI';

    // Cover.
    const cover = pptx.addSlide();
    cover.background = { color: theme.bg };
    cover.addShape('rect', { x: 0, y: H - 0.35, w: W, h: 0.35, fill: { color: theme.accent } });
    cover.addText(title, {
        ...rtl,
        x: M,
        y: 2.2,
        w: W - 2 * M,
        h: 1.6,
        fontSize: 44,
        bold: true,
        color: theme.title,
        fit: 'shrink'
    });
    if (subtitle) {
        cover.addText(subtitle, { ...rtl, x: M, y: 3.9, w: W - 2 * M, h: 0.9, fontSize: 22, color: theme.text });
    }

    slides.forEach((spec, index) => {
        const slide = pptx.addSlide();
        slide.background = { color: theme.bg };
        const layout = spec.layout ?? 'bullets';
        const number = index + 2;

        if (layout === 'section') {
            slide.background = { color: theme.accent };
            slide.addText(spec.title, {
                ...rtl,
                x: M,
                y: 2.6,
                w: W - 2 * M,
                h: 1.4,
                fontSize: 40,
                bold: true,
                color: 'FFFFFF'
            });
            if (spec.bullets?.[0]) {
                slide.addText(spec.bullets[0], {
                    ...rtl,
                    x: M,
                    y: 4.0,
                    w: W - 2 * M,
                    h: 0.8,
                    fontSize: 20,
                    color: 'FFFFFF'
                });
            }
        } else if (layout === 'quote') {
            slide.addText(`”${spec.bullets?.[0] ?? spec.title}“`, {
                ...rtl,
                x: M + 0.6,
                y: 1.8,
                w: W - 2 * M - 1.2,
                h: 2.8,
                fontSize: 32,
                italic: true,
                color: theme.title,
                valign: 'middle',
                fit: 'shrink'
            });
            slide.addText(spec.bullets?.[1] ? `— ${spec.bullets[1]}` : spec.title, {
                ...rtl,
                x: M + 0.6,
                y: 4.8,
                w: W - 2 * M - 1.2,
                h: 0.6,
                fontSize: 18,
                color: theme.accent
            });
        } else {
            header(slide, theme, spec.title, number);
            const top = 1.65;
            const height = H - top - 0.8;

            if (layout === 'two_column') {
                const colW = (W - 2 * M - 0.4) / 2;
                const columns = [
                    { heading: spec.column_titles?.[0], items: spec.bullets ?? [], x: M + colW + 0.4 },
                    { heading: spec.column_titles?.[1], items: spec.right_bullets ?? [], x: M }
                ];
                for (const column of columns) {
                    slide.addShape('roundRect', {
                        x: column.x,
                        y: top,
                        w: colW,
                        h: height,
                        fill: { color: theme.panel },
                        line: { color: theme.soft },
                        rectRadius: 0.12
                    });
                    const runs = [
                        ...(column.heading
                            ? [
                                  {
                                      text: column.heading,
                                      options: { bold: true, fontSize: 22, color: theme.accent, breakLine: true, paraSpaceAfter: 12 }
                                  }
                              ]
                            : []),
                        ...bulletRuns(column.items, theme, 18)
                    ];
                    slide.addText(runs, { ...rtl, x: column.x + 0.25, y: top + 0.2, w: colW - 0.5, h: height - 0.4, valign: 'top', fit: 'shrink' });
                }
            } else if (layout === 'stats' && spec.stats?.length) {
                const count = spec.stats.length;
                const gap = 0.35;
                const boxW = (W - 2 * M - gap * (count - 1)) / count;
                spec.stats.forEach((stat, i) => {
                    const x = W - M - boxW - i * (boxW + gap);
                    slide.addShape('roundRect', {
                        x,
                        y: top + 0.5,
                        w: boxW,
                        h: 2.6,
                        fill: { color: theme.panel },
                        line: { color: theme.soft },
                        rectRadius: 0.12
                    });
                    slide.addText(stat.value, { x, y: top + 0.8, w: boxW, h: 1.2, fontFace: FONT, fontSize: 40, bold: true, color: theme.accent, align: 'center', fit: 'shrink' });
                    slide.addText(stat.label, { ...rtl, align: 'center', x: x + 0.2, y: top + 2.0, w: boxW - 0.4, h: 0.9, fontSize: 16, color: theme.text, fit: 'shrink' });
                });
                if (spec.bullets?.length) {
                    slide.addText(bulletRuns(spec.bullets, theme, 16), { ...rtl, x: M, y: top + 3.4, w: W - 2 * M, h: 1.6, valign: 'top', fit: 'shrink' });
                }
            } else if (layout === 'chart' && spec.chart) {
                const chart = spec.chart;
                const type = CHART_TYPES[chart.type] ?? 'bar';
                const hasText = spec.bullets?.length > 0;
                const chartW = hasText ? (W - 2 * M) * 0.62 : W - 2 * M;
                slide.addChart(
                    type,
                    (chart.series ?? []).map((series) => ({ name: series.name, labels: chart.labels, values: series.values })),
                    {
                        x: M,
                        y: top,
                        w: chartW,
                        h: height,
                        chartColors: [theme.accent, 'F59E0B', '10B981', 'EF4444', '06B6D4', 'A855F7'],
                        showLegend: (chart.series ?? []).length > 1 || type === 'pie' || type === 'doughnut',
                        legendPos: 'b',
                        legendColor: theme.text,
                        catAxisLabelColor: theme.text,
                        valAxisLabelColor: theme.text,
                        valGridLine: { color: theme.soft, size: 0.5 },
                        dataLabelColor: theme.text,
                        showValue: type !== 'line',
                        catAxisLabelFontFace: FONT,
                        legendFontFace: FONT
                    }
                );
                if (hasText) {
                    slide.addText(bulletRuns(spec.bullets, theme, 17), {
                        ...rtl,
                        x: M + chartW + 0.3,
                        y: top,
                        w: W - 2 * M - chartW - 0.3,
                        h: height,
                        valign: 'top',
                        fit: 'shrink'
                    });
                }
            } else {
                slide.addText(bulletRuns(spec.bullets ?? [], theme), {
                    ...rtl,
                    x: M,
                    y: top,
                    w: W - 2 * M,
                    h: height,
                    valign: 'top',
                    fit: 'shrink'
                });
            }
        }
        if (spec.notes) slide.addNotes(spec.notes);
    });

    return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }));
}

// A meeting invite (.ics) that any calendar opens. Times come in as ISO 8601
// with an offset and go out in UTC, which every calendar converts back.
export function buildInvite({ title, start, end, location, description, attendees = [], organizer, uid }) {
    const stamp = (value) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escape = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const fold = (line) => {
        // Lines over 75 octets are folded, as RFC 5545 requires.
        const bytes = Buffer.from(line);
        if (bytes.length <= 75) return line;
        const parts = [];
        let current = '';
        for (const char of line) {
            if (Buffer.byteLength(current + char) > (parts.length ? 74 : 75)) {
                parts.push(current);
                current = char;
            } else current += char;
        }
        parts.push(current);
        return parts.join('\r\n ');
    };
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//MENDI AI//HE',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp(Date.now())}`,
        `DTSTART:${stamp(start)}`,
        `DTEND:${stamp(end)}`,
        `SUMMARY:${escape(title)}`,
        ...(location ? [`LOCATION:${escape(location)}`] : []),
        ...(description ? [`DESCRIPTION:${escape(description)}`] : []),
        ...(organizer ? [`ORGANIZER:mailto:${organizer}`] : []),
        ...attendees.map((email) => `ATTENDEE;RSVP=TRUE;ROLE=REQ-PARTICIPANT:mailto:${email}`),
        'END:VEVENT',
        'END:VCALENDAR'
    ];
    return lines.map(fold).join('\r\n') + '\r\n';
}

// A table that Excel opens with Hebrew intact: UTF-8 with a byte-order mark.
export function buildCsv(columns, rows) {
    const cell = (value) => {
        const text = value === null || value === undefined ? '' : String(value);
        // A leading = + - @ would run as a formula in Excel; numbers stay numbers.
        const safe = /^[=+\-@]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text) ? `'${text}` : text;
        return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const body = [columns, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
    return `\uFEFF${body}\r\n`;
}
