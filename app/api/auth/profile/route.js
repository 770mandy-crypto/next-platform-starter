import { NextResponse } from "next/server";
import { updateUser } from "lib/supabase";

export async function PUT(request) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = JSON.parse(atob(token));
    const { name, phone, address, city, postalCode, country } = await request.json();

    // Update user profile in database
    const updatedUser = await updateUser(user.id, {
      name,
      phone,
      address,
      city,
      postal_code: postalCode,
      country
    });

    const newToken = btoa(JSON.stringify({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name
    }));

    const response = NextResponse.json({
      user: { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name }
    });

    response.cookies.set('auth-token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
