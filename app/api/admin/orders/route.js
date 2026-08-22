import { NextResponse } from "next/server";
import { getAllOrders } from "lib/supabase";

export async function GET(request) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    // Fetch orders from database with status filter
    const orders = await getAllOrders(status);

    // Map to frontend format
    const formattedOrders = orders.map(order => ({
      id: order.id,
      customer: order.customer_name || 'N/A',
      email: order.email,
      total: order.total,
      status: order.status,
      date: order.created_at,
      itemCount: order.order_items?.length || 0,
      items: order.order_items
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
