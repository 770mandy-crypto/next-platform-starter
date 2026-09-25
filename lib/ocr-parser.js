// OCR parser for schedule extraction using Claude Vision API
// Extracts schedule from photos or images

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `אתה מנתח מומחה של מערכות שעות לתלמידים בישראל.
המשימה שלך:
1. קרא את תמונת מערכת השעות
2. חלץ כל שיעור: נושא, יום, שעת התחלה, שעת סיום, חדר, מורה (אם יש)
3. החזר JSON מובנה בדיוק ככה (NO OTHER TEXT):

{
  "classes": [
    {
      "subject": "מתמטיקה",
      "dayOfWeek": 0,
      "startTime": "08:00",
      "endTime": "09:00",
      "room": "305",
      "teacher": "מר כהן"
    }
  ],
  "confidence": 0.95,
  "notes": "מערכת שעות ברורה וקריאה"
}

Day of week: 0 = ראשון, 1 = שני, 2 = שלישי, 3 = רביעי, 4 = חמישי, 5 = שישי, 6 = שבת

אם לא מצא מערכת שעות - החזר {"error": "לא נמצאה מערכת שעות בתמונה"}`;

/**
 * Extract schedule from image using Claude Vision
 */
export async function extractScheduleFromImage(imageBase64, mediaType = 'image/jpeg') {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'אנא חלץ את מערכת השעות מהתמונה הזו וחזור JSON בלבד.',
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    // Extract JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        error: 'Could not parse response',
        raw: textContent,
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (result.error) {
      return result;
    }

    if (result.classes && Array.isArray(result.classes)) {
      // Validate each class
      result.classes = result.classes.map(cls => ({
        subject: cls.subject || 'Unknown',
        dayOfWeek: parseInt(cls.dayOfWeek) || 0,
        startTime: cls.startTime || '00:00',
        endTime: cls.endTime || '00:00',
        room: cls.room || '',
        teacher: cls.teacher || '',
      }));
    }

    return result;
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      error: 'Failed to extract schedule',
      details: error.message,
    };
  }
}

/**
 * Extract homework from image
 */
export async function extractHomeworkFromImage(imageBase64, mediaType = 'image/jpeg') {
  const HOMEWORK_PROMPT = `אתה מנתח של שיעורי בית.
קרא את התמונה וחלץ:
- הנושא (subject)
- תיאור המשימה (description)
- את תאריך ההגשה אם יש (dueDate in YYYY-MM-DD format)

החזר JSON:
{
  "subject": "מתמטיקה",
  "title": "פתור תרגילים 1-20",
  "description": "ספר מתמטיקה עמוד 45",
  "dueDate": "2024-12-25",
  "confidence": 0.9
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1000,
      system: HOMEWORK_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'חלץ את פרטי השיעור הזה',
            },
          ],
        },
      ],
    });

    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { error: 'Could not parse homework' };
  } catch (error) {
    console.error('Homework OCR Error:', error);
    return { error: 'Failed to extract homework' };
  }
}

/**
 * Extract exam details from image
 */
export async function extractExamFromImage(imageBase64, mediaType = 'image/jpeg') {
  const EXAM_PROMPT = `אתה מנתח של בחינות.
קרא את התמונה וחלץ:
- נושא הבחינה (subject)
- תאריך (date in YYYY-MM-DD)
- שעה (time in HH:MM)
- חדר (room)

החזר JSON:
{
  "subject": "מתמטיקה",
  "date": "2024-12-25",
  "time": "09:00",
  "room": "305",
  "confidence": 0.85
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 800,
      system: EXAM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'חלץ פרטי בחינה',
            },
          ],
        },
      ],
    });

    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { error: 'Could not parse exam' };
  } catch (error) {
    console.error('Exam OCR Error:', error);
    return { error: 'Failed to extract exam' };
  }
}
