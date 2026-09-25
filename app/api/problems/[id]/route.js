import { NextResponse } from 'next/server';
import { getStore } from '@netlify/blobs';

export async function GET(request, { params }) {
    try {
        const blobc = await getStore('fixnow');
        const data = await blobc.get(`problem:${params.id}`);

        if (!data) {
            return NextResponse.json(
                { error: 'בעיה לא נמצאה' },
                { status: 404 }
            );
        }

        const problem = JSON.parse(data);
        return NextResponse.json(problem);
    } catch (error) {
        console.error('Problem fetch error:', error);
        return NextResponse.json(
            { error: 'שגיאה בהבאת הבקשה' },
            { status: 500 }
        );
    }
}
