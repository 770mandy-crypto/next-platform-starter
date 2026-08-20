import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = {
      id: Math.random().toString(36).substring(7),
      email,
      password,
      name,
      createdAt: new Date().toISOString()
    };

    // Create session token
    const token = btoa(JSON.stringify(user));

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name }
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Signup failed" },
      { status: 500 }
    );
  }
}
