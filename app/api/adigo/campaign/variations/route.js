import { generateCampaignVariations } from "@/lib/adigo/ai-service";
import { generateCampaignMock } from "@/lib/adigo/mock-ai";

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

    // בדיקה של API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.includes("YOUR_KEY")) {
      // אם אין API key, השתמש בMock
      console.log("ללא API key תקף, משתמש בMock service");
      mockMode = true;
      // צור 3 גרסאות mock
      const mockVariation = generateCampaignMock(campaignData);
      variations = [
        mockVariation,
        generateCampaignMock({ ...campaignData, offerDescription: offerDescription + " (גרסה 2)" }),
        generateCampaignMock({ ...campaignData, offerDescription: offerDescription + " (גרסה 3)" }),
      ];
    } else {
      try {
        variations = await generateCampaignVariations(campaignData);
      } catch (aiError) {
        console.error("שגיאה ב-AI, משתמש בMock:", aiError);
        mockMode = true;
        const mockVariation = generateCampaignMock(campaignData);
        variations = [
          mockVariation,
          generateCampaignMock({ ...campaignData, offerDescription: offerDescription + " (גרסה 2)" }),
          generateCampaignMock({ ...campaignData, offerDescription: offerDescription + " (גרסה 3)" }),
        ];
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
