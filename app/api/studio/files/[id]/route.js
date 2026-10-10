import { NextResponse } from 'next/server';
import { route } from 'lib/pilot/http';
import { getJob, loadFile } from 'lib/studio/jobs';
import { fetchDubbedFile } from 'lib/studio/providers';

export const dynamic = 'force-dynamic';

// A finished job's file. The job id is a random UUID and works as a private
// share link (see lib/studio/jobs.js): the cloud editor fetches voice-overs and
// dubs from here, so this route does not ask for a session.
export const GET = route(async (request, { params }) => {
    const { id } = await params;
    const job = await getJob(id);
    if (!job || job.status !== 'done') return NextResponse.json({ error: 'הקובץ לא נמצא.' }, { status: 404 });

    const download = new URL(request.url).searchParams.has('download');
    const disposition = (ext) =>
        `${download ? 'attachment' : 'inline'}; filename="studio-${job.id.slice(0, 8)}.${ext}"`;

    // A file kept in our store (a voice-over, or a result a model sent inline).
    // Only media types are served as themselves; anything else, such as HTML or
    // SVG a model could return, is a download, so it never runs on this site.
    const stored = job.kind === 'dub' ? null : await loadFile(job.id);
    if (stored) {
        const safe = /^(image\/(png|jpe?g|webp|gif)|video\/[\w.+-]+|audio\/[\w.+-]+)$/.test(stored.type);
        const ext = safe ? stored.type.split('/')[1].replace('mpeg', 'mp3').replace('jpeg', 'jpg') : 'bin';
        return new Response(stored.data, {
            headers: {
                'content-type': safe ? stored.type : 'application/octet-stream',
                'content-disposition': safe
                    ? disposition(ext)
                    : `attachment; filename="studio-${job.id.slice(0, 8)}.bin"`,
                'x-content-type-options': 'nosniff',
                'cache-control': 'private, max-age=3600'
            }
        });
    }
    if (job.kind === 'voiceover') return NextResponse.json({ error: 'הקובץ לא נמצא.' }, { status: 404 });

    if (job.kind === 'dub') {
        const upstream = await fetchDubbedFile(job.providerId, job.input.language);
        const type = upstream.headers.get('content-type') || 'video/mp4';
        return new Response(upstream.body, {
            headers: {
                'content-type': type,
                'content-disposition': disposition(type.startsWith('audio/') ? 'mp3' : 'mp4'),
                'cache-control': 'private, max-age=3600'
            }
        });
    }

    if (job.url) return NextResponse.redirect(job.url);
    return NextResponse.json({ error: 'הקובץ לא נמצא.' }, { status: 404 });
});
