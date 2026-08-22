import { NextResponse } from "next/server";
import { supabase, updateOrderStatus } from "lib/supabase";

export async function GET(request, { params }) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Fetch order from database
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', params.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      order: {
        id: order.id,
        customer: order.customer_name,
        email: order.email,
        total: order.total,
        status: order.status,
        date: order.created_at,
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

export async function PUT(request, { params }) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { status } = await request.json();

    // Update order status in database
    const order = await updateOrderStatus(params.id, status);

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status
      }
    });
  } catch (error) {
    console.error("Order update error:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
