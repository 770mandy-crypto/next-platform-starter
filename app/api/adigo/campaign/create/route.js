import { generateCampaign } from "@/lib/adigo/ai-service";
import { generateCampaignMock } from "@/lib/adigo/mock-ai";

export async function POST(request) {
  try {
    const body = await request.json();

    // וידוא שכל השדות הנדרשים קיימים
    if (
      !body.businessName ||
      !body.businessCategory ||
      !body.targetAudience ||
      !body.offerDescription
    ) {
      return Response.json(
        {
          error: "חסרים שדות נדרשים",
          required: [
            "businessName",
            "businessCategory",
            "targetAudience",
            "offerDescription",
          ],
        },
        { status: 400 }
      );
    }

    let campaign;
    const hasValidApiKey =
      process.env.ANTHROPIC_API_KEY &&
      process.env.ANTHROPIC_API_KEY.startsWith("sk-") &&
      !process.env.ANTHROPIC_API_KEY.includes("YOUR_API_KEY");

    try {
      if (hasValidApiKey) {
        campaign = await generateCampaign({
          businessName: body.businessName,
          businessCategory: body.businessCategory,
          targetAudience: body.targetAudience,
          offerDescription: body.offerDescription,
          channel: body.channel || "all",
        });
      } else {
        campaign = await generateCampaignMock({
          businessName: body.businessName,
          businessCategory: body.businessCategory,
          targetAudience: body.targetAudience,
          offerDescription: body.offerDescription,
          channel: body.channel || "all",
        });
      }
    } catch (aiError) {
      console.warn("בעיה ב-Claude, מחליפים ל-Mock:", aiError.message);
      campaign = await generateCampaignMock({
        businessName: body.businessName,
        businessCategory: body.businessCategory,
        targetAudience: body.targetAudience,
        offerDescription: body.offerDescription,
        channel: body.channel || "all",
      });
    }

    const result = {
      ...campaign,
      id: `campaign_${Date.now()}`,
      createdAt: new Date().toISOString(),
      businessName: body.businessName,
      businessCategory: body.businessCategory,
      offerDescription: body.offerDescription,
      mockMode: !hasValidApiKey,
    };

    return Response.json(result);
  } catch (error) {
    console.error("שגיאה ב-API:", error);
    return Response.json(
      {
        error: error.message || "שגיאה בשרת",
      },
      { status: 500 }
    );
  }
}
