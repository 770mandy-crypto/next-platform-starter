import { NextResponse } from "next/server";
import { getOrderById } from "lib/supabase";

export async function GET(request, { params }) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = JSON.parse(atob(token));

    // Fetch order from database
    const order = await getOrderById(params.id, user.id);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        id: order.id,
        total: order.total,
        status: order.status,
        createdAt: order.created_at,
        items: order.order_items || []
      }
    });
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
