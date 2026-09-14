import { generateCampaignVariations } from "@/lib/adigo/ai-service";
import { generateCampaignMock } from "@/lib/adigo/mock-ai";
import { hasClaude } from "@/lib/adigo/ai-clients";

function mockVariations(campaignData) {
  return Promise.all([
    generateCampaignMock(campaignData),
    generateCampaignMock({
      ...campaignData,
      offerDescription: campaignData.offerDescription + " ",
    }),
    generateCampaignMock({
      ...campaignData,
      offerDescription: " " + campaignData.offerDescription + "  ",
    }),
  ]);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      businessName,
      businessCategory,
      targetAudience,
      offerDescription,
    } = body;

    // בדיקה של שדות חובה
    if (!businessName || !businessCategory || !targetAudience || !offerDescription) {
      return Response.json(
        { error: "חסרים שדות חובה" },
        { status: 400 }
      );
    }

    const campaignData = {
      businessName,
      businessCategory,
      targetAudience,
      offerDescription,
    };

    let variations;
    let mockMode = false;

    if (!hasClaude()) {
      mockMode = true;
      variations = await mockVariations(campaignData);
    } else {
      try {
        variations = await generateCampaignVariations(campaignData);
      } catch (aiError) {
        console.error("שגיאה ב-AI, משתמש בMock:", aiError);
        mockMode = true;
        variations = await mockVariations(campaignData);
      }
    }

    return Response.json({
      variations,
      mockMode,
      message: mockMode ? "גרסה מוקדמת של הגרסאות" : "הגרסאות הוצרו בהצלחה",
    });
  } catch (error) {
    console.error("שגיאה כללית:", error);
    return Response.json(
      { error: `שגיאה ביצירת גרסאות: ${error.message}` },
      { status: 500 }
    );
  }
}
