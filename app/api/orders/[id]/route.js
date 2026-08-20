import { NextResponse } from "next/server";

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

    // TODO: Fetch order from database
    // const order = await db.order.findUnique({
    //   where: { id: params.id },
    //   include: { items: true }
    // });
    //
    // if (!order || order.userId !== user.id) {
    //   return NextResponse.json({ error: "Order not found" }, { status: 404 });
    // }

    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Order fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
