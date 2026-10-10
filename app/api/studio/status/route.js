import { NextResponse } from 'next/server';
import { MODELS } from 'lib/studio/catalog';
import { modelSlug, providerStatus } from 'lib/studio/providers';

export const dynamic = 'force-dynamic';

// Which studio providers have a key on this site, and which model each
// generation slot currently points at. No keys are returned, only whether set.
export async function GET() {
    return NextResponse.json(
        {
            providers: providerStatus(),
            models: MODELS.map((model) => ({
                id: model.id,
                label: model.label,
                kind: model.kind,
                slug: modelSlug(model.id)
            }))
        },
        { headers: { 'cache-control': 'no-store' } }
    );
}
