import { NextResponse } from "next/server";
import { findUserByEmail } from "lib/supabase";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await findUserByEmail(email);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Create session token
    const token = btoa(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name
    }));

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
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Signin failed" },
      { status: 500 }
    );
  }
}
