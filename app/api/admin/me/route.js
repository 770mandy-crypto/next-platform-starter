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

    const admin = JSON.parse(atob(token));

    return NextResponse.json({ admin });
  } catch (error) {
    console.error("Admin auth check error:", error);
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }
}
