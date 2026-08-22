import { NextResponse } from "next/server";
import { supabase, getProducts } from "lib/supabase";

export async function GET(request) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Fetch products from database
    const products = await getProducts();

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
    const id = Math.random().toString(36).substring(7);
    const slug = name.toLowerCase().replace(/\s+/g, '-');

    // Save product to database
    const { data, error } = await supabase
      .from('products')
      .insert([{
        id,
        name,
        slug,
        price: parseFloat(price),
        description,
        image_url: image
      }])
      .select();

    if (error) throw error;

    return NextResponse.json({ product: data[0] });
  } catch (error) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
