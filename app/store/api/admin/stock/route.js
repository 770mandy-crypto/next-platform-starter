import { NextResponse } from 'next/server';
import { getCurrentUser } from 'lib/store/current-user';
import { createAdminSupabaseClient, isSupabaseAdminConfigured } from 'lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(request) {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile?.is_admin) {
    return NextResponse.json({ error: 'לא מורשה.' }, { status: 403 });
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not set.' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const updates = Array.isArray(body?.updates) ? body.updates : [];
  if (updates.length === 0) {
    return NextResponse.json({ error: 'אין נתונים לעדכון.' }, { status: 400 });
  }

  const supabase = createAdminSupabaseClient();
  for (const u of updates) {
    const stock = Math.max(0, Number(u.stock) || 0);
    const { error } = await supabase
      .from('product_variants')
      .update({ stock })
      .eq('product_slug', u.product_slug)
      .eq('size', u.size);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
