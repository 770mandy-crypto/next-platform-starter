import { NextResponse } from 'next/server';
import { route } from 'lib/pilot/http';
import { loadFileData } from 'lib/mendi/store';

export const dynamic = 'force-dynamic';

// A file an agent made. Its id ends in a random UUID and works as a private
// share link: WhatsApp downloads attachments from here, so this route does not
// ask for a session. Files are always served as downloads, never rendered.
export const GET = route(async (request, { params }) => {
    const { id } = await params;
    const file = await loadFileData(id);
    if (!file) return NextResponse.json({ error: 'הקובץ לא נמצא.' }, { status: 404 });
    const ascii = file.name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
    return new Response(file.data, {
        headers: {
            'content-type': file.type || 'application/octet-stream',
            'content-disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
            'x-content-type-options': 'nosniff',
            'cache-control': 'private, max-age=3600'
        }
    });
});
