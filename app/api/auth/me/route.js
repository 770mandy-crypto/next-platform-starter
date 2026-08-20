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

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401 }
    );
  }
}
