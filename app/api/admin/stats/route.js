import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // TODO: Fetch real stats from database
    // For now, return placeholder stats
    const stats = {
      totalOrders: 0,
      totalProducts: 8,
      totalUsers: 0,
      recentOrders: []
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
