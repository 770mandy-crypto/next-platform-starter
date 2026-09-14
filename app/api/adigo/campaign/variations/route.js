import { generateCampaignVariations } from "@/lib/adigo/ai-service";
import { generateCampaignMock } from "@/lib/adigo/mock-ai";
import { hasClaude } from "@/lib/adigo/ai-clients";

// בלי Claude יש רק תבנית אחת לכל קטגוריה, ואין דרך לייצר ממנה שלוש גרסאות
// שונות באמת. מחזירים אחת ומסמנים mockMode, במקום שלוש זהות.
function mockVariations(campaignData) {
  return Promise.all([generateCampaignMock(campaignData)]);
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
      message: mockMode
        ? "כדי לקבל שלוש גרסאות שונות צריך לחבר מפתח Claude. בינתיים זו גרסה אחת מתבנית."
        : "הגרסאות נוצרו בהצלחה",
    });
  } catch (error) {
    console.error("שגיאה כללית:", error);
    return Response.json(
      { error: `שגיאה ביצירת גרסאות: ${error.message}` },
      { status: 500 }
    );
  }
}
