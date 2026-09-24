import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `אתה מורה פרטי בעברית המתמחה בעזרה לתלמידים בישראל.
התפקיד שלך הוא:
1. להסביר קונספטים לימודיים בצורה ברורה ופשוטה
2. לעזור בפתרון שיעורי בית (בלי פשוט לתת את התשובה)
3. לסכם נושאים לבחינה
4. להציע טיפים למידה
5. לעזור בעברית, מתמטיקה, מדעים, וכל הנושאים האחרים

שמור על תגובות קצרות וממוקדות, בעברית תקינה. השתמש בדוגמאות כשצריך.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, subject = 'כללי', context = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'unconfigured',
          headline: 'עזרה בלימודים דורשת מפתח Claude',
          detail: 'הוסף ANTHROPIC_API_KEY במשתני הסביבה',
        },
        { status: 503 }
      );
    }

    // Build conversation history
    const messages = [
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ];

    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: messages,
    });

    // Extract text response
    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      }
    }

    return NextResponse.json({
      response: textContent,
      subject: subject,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Study help error:', error);

    if (error.status === 401) {
      return NextResponse.json(
        { error: 'invalid_api_key', detail: 'API key is invalid or expired' },
        { status: 401 }
      );
    }

    if (error.status === 429) {
      return NextResponse.json(
        { error: 'rate_limited', detail: 'Too many requests - please wait' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', detail: error.message },
      { status: 500 }
    );
  }
}
