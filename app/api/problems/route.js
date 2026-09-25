import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST(request) {
    try {
        const formData = await request.formData();
        const title = formData.get('title');
        const description = formData.get('description');
        const category = formData.get('category');
        const imageFile = formData.get('image');
        const token = request.cookies.get('fixnow_token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        if (!title || !description) {
            return NextResponse.json(
                { error: 'כותרת ותיאור נדרשים' },
                { status: 400 }
            );
        }

        const problemId = `problem_${Date.now()}`;
        let imageBase64 = null;

        if (imageFile) {
            const buffer = await imageFile.arrayBuffer();
            imageBase64 = Buffer.from(buffer).toString('base64');
        }

        const analysisPrompt = `אתה עוזר בתחום תיקונים בבית וחיפוש טכנאים.

בעיה שתיאר הלקוח:
כותרת: ${title}
קטגוריה משוערת: ${category || 'לא צוינה'}
תיאור: ${description}

בהתבסס על תיאור זה, בצע את הפעולות הבאות:

1. **זהה סוג השירות** - אילו סוגי טכנאים דרושים? (בעברית)
2. **מילות מפתח** - אילו מילים מחפשים (קטגוריות, סוגי בעיה)
3. **דירוג רלוונטיות** - כמה ברור שזה שירות נדרש (0-100%)
4. **טיפים חכמים** - אילו דברים הלקוח צריך לבדוק לפני קריאה לטכנאי
5. **דחיפות** - האם זה דחוף? (כן/לא)

תשב בפורמט JSON עברי:
{
  "serviceTypes": ["סוג 1", "סוג 2"],
  "keywords": ["מילה 1", "מילה 2"],
  "relevanceScore": 95,
  "checklist": [
    "בדיקה 1",
    "בדיקה 2"
  ],
  "isUrgent": false,
  "estimatedCost": "150-300 ש״ח",
  "tips": ["טיפ 1", "טיפ 2"]
}`;

        let analysis = {
            serviceTypes: ['טכנאי כללי'],
            keywords: [title.toLowerCase()],
            relevanceScore: 80,
            checklist: [
                'צלם תמונות של הבעיה',
                'תאר בדיוק מתי התחילה הבעיה',
                'רשום את גיל הציוד או הבית'
            ],
            isUrgent: false,
            estimatedCost: '150-300 ש״ח',
            tips: ['בדוק אם זה בטוח', 'עמוד זמין לשיחה עם הטכנאי']
        };

        if (process.env.ANTHROPIC_API_KEY) {
            try {
                const message = await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 500,
                    messages: [
                        {
                            role: 'user',
                            content: analysisPrompt
                        }
                    ]
                });

                const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    analysis = JSON.parse(jsonMatch[0]);
                }
            } catch (error) {
                console.error('Claude API error:', error);
            }
        }

        const blobc = await getStore('fixnow');

        const problemData = {
            id: problemId,
            title,
            description,
            category: category || analysis.serviceTypes[0],
            imageBase64,
            analysis,
            createdAt: new Date().toISOString(),
            status: 'open'
        };

        await blobc.set(`problem:${problemId}`, JSON.stringify(problemData));

        return NextResponse.json({
            id: problemId,
            title,
            analysis,
            createdAt: problemData.createdAt
        });
    } catch (error) {
        console.error('Problem creation error:', error);
        return NextResponse.json(
            { error: 'שגיאה בשליחת הבקשה' },
            { status: 500 }
        );
    }
}
