import { NextResponse } from "next/server";

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

    // TODO: Fetch orders from database
    // For now, return empty orders array
    // In production, this would query:
    // const orders = await db.order.findMany({
    //   where: { userId: user.id },
    //   include: { items: true }
    // });

    const orders = [];

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
