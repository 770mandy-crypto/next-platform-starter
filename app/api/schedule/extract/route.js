import { NextResponse } from 'next/server';
import { extractScheduleFromImage } from 'lib/ocr-parser';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { imageData, mediaType = 'image/jpeg' } = body;

    if (!imageData) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'unconfigured',
          headline: 'חילוץ מערכת שעות דורש Claude API',
          detail: 'הוסף ANTHROPIC_API_KEY במשתני הסביבה',
        },
        { status: 503 }
      );
    }

    // Extract base64 if it comes with data URL prefix
    let base64 = imageData;
    if (imageData.includes(',')) {
      base64 = imageData.split(',')[1];
    }

    const result = await extractScheduleFromImage(base64, mediaType);

    if (result.error) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      schedule: result,
      classCount: result.classes?.length || 0,
    });
  } catch (error) {
    console.error('Schedule extraction error:', error);
    return NextResponse.json(
      { error: 'extraction_failed', detail: error.message },
      { status: 500 }
    );
  }
}
