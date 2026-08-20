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

    // TODO: Fetch products from database
    // For now, return placeholder products
    const products = [
      {
        id: '1',
        name: 'Classic T-Shirt',
        price: 199,
        description: 'Premium quality t-shirt'
      },
      {
        id: '2',
        name: 'Silk Shorts',
        price: 299,
        description: 'Comfortable silk shorts'
      }
    ];

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { name, price, description, image } = await request.json();

    // TODO: Save product to database
    const product = {
      id: Math.random().toString(36).substring(7),
      name,
      price,
      description,
      image
    };

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
