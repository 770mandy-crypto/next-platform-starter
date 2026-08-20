import { NextResponse } from "next/server";

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

    // TODO: Update user profile in database
    // const updatedUser = await db.user.update({
    //   where: { id: user.id },
    //   data: { name, phone, address, city, postalCode, country }
    // });
    //
    // const newToken = btoa(JSON.stringify(updatedUser));
    // const response = NextResponse.json({ user: updatedUser });
    // response.cookies.set('auth-token', newToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'lax',
    //   maxAge: 60 * 60 * 24 * 7
    // });
    // return response;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
