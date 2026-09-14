import { generateCampaign } from "@/lib/adigo/ai-service";
import { generateCampaignMock } from "@/lib/adigo/mock-ai";
import { generateCampaignImage, generateImageMock } from "@/lib/adigo/image-generator";
import { hasClaude, hasOpenAI } from "@/lib/adigo/ai-clients";

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
    let imageData = null;
    const hasValidApiKey = hasClaude();
    const hasValidOpenAIKey = hasOpenAI();

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

    // יצירת תמונה
    try {
      if (hasValidOpenAIKey) {
        imageData = await generateCampaignImage({
          businessName: body.businessName,
          businessCategory: body.businessCategory,
          offerDescription: body.offerDescription,
        });
      } else {
        imageData = await generateImageMock({
          businessName: body.businessName,
          businessCategory: body.businessCategory,
          offerDescription: body.offerDescription,
        });
      }
    } catch (imageError) {
      console.warn("בעיה בייצור תמונה, משתמשים ב-Mock:", imageError.message);
      imageData = await generateImageMock({
        businessName: body.businessName,
        businessCategory: body.businessCategory,
        offerDescription: body.offerDescription,
      });
    }

    const result = {
      ...campaign,
      id: `campaign_${Date.now()}`,
      createdAt: new Date().toISOString(),
      businessName: body.businessName,
      businessCategory: body.businessCategory,
      targetAudience: body.targetAudience,
      offerDescription: body.offerDescription,
      imageUrl: imageData?.imageUrl || null,
      mockMode: !hasValidApiKey,
      imageMockMode: !hasValidOpenAIKey,
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
