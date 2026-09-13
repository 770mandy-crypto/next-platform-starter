import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const response = await client.images.generate({
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

export async function generateImageMock(campaignData) {
  // Mock תמונה אם אין API key
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  return {
    imageUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'%3E%3Crect fill='${encodeURIComponent(randomColor)}' width='1024' height='1024'/%3E%3Ctext x='512' y='512' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' font-family='Arial'%3E${campaignData.businessName}%3C/text%3E%3Ctext x='512' y='600' font-size='32' fill='white' text-anchor='middle' dominant-baseline='middle' font-family='Arial'%3E${campaignData.offerDescription.substring(0, 30)}...%3C/text%3E%3C/svg%3E`,
    revisedPrompt: `Mock image for ${campaignData.businessName}`,
  };
}
