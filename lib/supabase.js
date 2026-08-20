import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export { supabase };

// Helper functions
export async function createUser(email, password, name) {
  const id = Math.random().toString(36).substring(7);
  const { data, error } = await supabase.from('users').insert([
    { id, email, password, name }
  ]).select();

  if (error) throw error;
  return data[0];
}

export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
}

export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*');

  if (error) throw error;
  return data;
}

export async function getProductBySlug(slug) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createOrder(userId, email, customerName, total, items) {
  const orderId = Math.random().toString(36).substring(7);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      id: orderId,
      user_id: userId,
      email,
      customer_name: customerName,
      total,
      status: 'pending'
    }])
    .select();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = items.map(item => ({
    id: Math.random().toString(36).substring(7),
    order_id: orderId,
    product_id: item.id,
    product_name: item.name,
    quantity: item.quantity,
    price: item.price
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  return order[0];
}

export async function getUserOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getOrderById(orderId, userId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*)
    `)
    .eq('id', orderId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select();

  if (error) throw error;
  return data[0];
}

export async function getAllOrders(status = null) {
  let query = supabase.from('orders').select(`
    *,
    order_items(*)
  `);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAdminStats() {
  const { data: orders } = await supabase.from('orders').select('*');
  const { data: products } = await supabase.from('products').select('*');
  const { data: users } = await supabase.from('users').select('*');

  return {
    totalOrders: orders?.length || 0,
    totalProducts: products?.length || 0,
    totalUsers: users?.length || 0,
    recentOrders: (orders || []).slice(0, 5)
  };
}
