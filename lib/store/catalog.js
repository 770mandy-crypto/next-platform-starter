import { createServerSupabaseClient } from 'lib/supabase/server';

export async function listProducts() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(size, stock)')
    .order('category')
    .order('color', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getProduct(slug) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variants(size, stock)')
    .eq('slug', slug)
    .single();
  if (error) return null;
  return data;
}

export async function getVariantsOf(category) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from('products').select('slug, color, image_path').eq('category', category);
  if (error) return [];
  return data;
}

export function totalStock(product) {
  return (product.product_variants || []).reduce((sum, v) => sum + v.stock, 0);
}
