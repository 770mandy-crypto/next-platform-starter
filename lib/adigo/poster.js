// ציור מודעה על קנבס בדפדפן. DALL-E לא יודע לכתוב עברית - הוא מייצר אותיות
// מעוותות - ולכן המודעה מצוירת כאן עם הטקסט המדויק שנכתב.

export const PALETTES = {
  חם: { bg: "#B93D0C", ink: "#FFF7F2", sub: "#FBD9C4", chip: "#2A0E03", chipTx: "#FFB27D", cta: "#2A0E03", ctaTx: "#FFD9BC" },
  כהה: { bg: "#17191C", ink: "#F6F4EF", sub: "#B0AFAA", chip: "#E0A03C", chipTx: "#17191C", cta: "#E0A03C", ctaTx: "#17191C" },
  נקי: { bg: "#F4F3EE", ink: "#191A18", sub: "#5C5E58", chip: "#1F5E48", chipTx: "#EFF7F2", cta: "#1F5E48", ctaTx: "#FFFFFF" },
  ירוק: { bg: "#1F5E48", ink: "#F2F8F4", sub: "#A9CDBC", chip: "#F0C24B", chipTx: "#123227", cta: "#F0C24B", ctaTx: "#123227" },
  כחול: { bg: "#1B3A6B", ink: "#F1F5FB", sub: "#A9BFDD", chip: "#F0C24B", chipTx: "#122540", cta: "#F0C24B", ctaTx: "#122540" },
};

export const PALETTE_NAMES = Object.keys(PALETTES);

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) return lines;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function drawPoster({ campaign, business, palette = "חם", badge = "" }) {
  const SIZE = 1080;
  const MARGIN = 88;
  const p = PALETTES[palette] || PALETTES["חם"];

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // סימן רקע עדין כדי שהריבוע לא יהיה שטח צבע אחיד
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(120, SIZE - 110, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";

  const right = SIZE - MARGIN;
  const maxWidth = SIZE - MARGIN * 2;
  let y = MARGIN;

  const logo = await loadImage(business?.logoUrl);
  if (logo) {
    const box = 108;
    const ratio = Math.min(box / logo.width, box / logo.height);
    const w = logo.width * ratio;
    const h = logo.height * ratio;
    ctx.drawImage(logo, right - w, y, w, h);
    y += box + 22;
  }

  if (badge) {
    ctx.font = "600 30px Rubik, Arial, sans-serif";
    const bw = ctx.measureText(badge).width + 46;
    ctx.fillStyle = p.chip;
    roundRect(ctx, right - bw, y, bw, 56, 14);
    ctx.fillStyle = p.chipTx;
    ctx.fillText(badge, right - 23, y + 13);
    y += 92;
  }

  ctx.fillStyle = p.ink;
  ctx.font = "700 76px Rubik, Arial, sans-serif";
  for (const line of wrapLines(ctx, campaign.headline, maxWidth, 4)) {
    ctx.fillText(line, right, y);
    y += 92;
  }

  y += 24;

  ctx.fillStyle = p.sub;
  ctx.font = "400 40px Assistant, Arial, sans-serif";
  const bodyText = String(campaign.body || "").replace(/\n+/g, " ");
  for (const line of wrapLines(ctx, bodyText, maxWidth, 5)) {
    ctx.fillText(line, right, y);
    y += 58;
  }

  if (campaign.cta) {
    ctx.font = "600 42px Rubik, Arial, sans-serif";
    const cw = ctx.measureText(campaign.cta).width + 76;
    const cy = SIZE - MARGIN - 158;
    ctx.fillStyle = p.cta;
    roundRect(ctx, right - cw, cy, cw, 86, 20);
    ctx.fillStyle = p.ctaTx;
    ctx.fillText(campaign.cta, right - 38, cy + 20);
  }

  if (campaign.businessName) {
    ctx.fillStyle = p.sub;
    ctx.font = "600 34px Rubik, Arial, sans-serif";
    ctx.fillText(campaign.businessName, right, SIZE - MARGIN - 44);
  }

  return canvas;
}
