import { NextResponse } from "next/server";
import { getUserOrders } from "lib/supabase";

export async function GET(request) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = JSON.parse(atob(token));
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Fetch orders from database
    const orders = await getUserOrders(user.id);

    // Map to frontend format
    const formattedOrders = orders.map(order => ({
      id: order.id,
      total: order.total,
      status: order.status,
      createdAt: order.created_at,
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
