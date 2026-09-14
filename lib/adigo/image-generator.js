import { openaiClient } from "./ai-clients";

export async function generateCampaignImage(campaignData) {
  const { businessName, businessCategory, offerDescription } = campaignData;

  // בנייה של prompt בעברית ל-DALL-E
  const prompt = `A professional, colorful marketing ad image for a ${businessCategory} business called "${businessName}" in Israel.
  The ad should feature the offer: "${offerDescription}".
  Style: Modern, vibrant, eye-catching, with Hebrew aesthetic.
  Include price tag or discount badge. Professional photography style.
  High quality, Instagram-ready, bright colors, welcoming atmosphere.
  Text should be in Hebrew if possible. Israeli business setting.`;

  try {
    const response = await openaiClient().images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return {
      imageUrl: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt,
    };
  } catch (error) {
    console.error("שגיאה ב-DALL-E:", error.message);
    throw error;
  }
}

function escapeXml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generateImageMock(campaignData) {
  // תמונת גיבוי כשאין מפתח OpenAI
  const colors = ["#B93D0C", "#1F5E48", "#17191C", "#8C3A5B", "#2F4858"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const title = escapeXml(campaignData.businessName);
  const offer = escapeXml(String(campaignData.offerDescription || "").slice(0, 40));

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">` +
    `<rect fill="${color}" width="1024" height="1024"/>` +
    `<text x="512" y="500" font-size="56" fill="#FFFFFF" text-anchor="middle" font-family="Arial, sans-serif" direction="rtl">${title}</text>` +
    `<text x="512" y="580" font-size="34" fill="#FFFFFF" text-anchor="middle" font-family="Arial, sans-serif" direction="rtl" opacity="0.85">${offer}</text>` +
    `</svg>`;

  return {
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    revisedPrompt: `תמונת גיבוי עבור ${campaignData.businessName}`,
  };
}
