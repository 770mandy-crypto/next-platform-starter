import { NextResponse } from 'next/server';
import { requireUser, route } from 'lib/pilot/http';
import { listJobs, publicJob, refreshJob } from 'lib/studio/jobs';

export const dynamic = 'force-dynamic';

// The signed-in user's recent jobs. Jobs still running are checked with their
// provider on the way out, so polling this is what moves them along.
export const GET = route(async (request) => {
    const user = await requireUser(request);
    const origin = new URL(request.url).origin;
    const jobs = await listJobs(user.id, 30);
    const fresh = await Promise.all(jobs.map((job) => refreshJob(job)));
    return NextResponse.json(
        { jobs: fresh.map((job) => publicJob(job, origin)) },
        { headers: { 'cache-control': 'no-store' } }
    );
});
