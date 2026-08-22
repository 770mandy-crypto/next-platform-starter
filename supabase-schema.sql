-- VALENTOS Database Schema
-- Paste this entire file into Supabase SQL Editor

-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  category TEXT,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  customer_name TEXT,
  total DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, paid, refunded
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id),
  product_id TEXT REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Products: Everyone can read
CREATE POLICY "Products are publicly readable"
ON products FOR SELECT USING (true);

-- Users: Only authenticated users can read/update their own
CREATE POLICY "Users can read their own data"
ON users FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
USING (auth.uid()::text = id);

-- Orders: Users can read their own orders
CREATE POLICY "Users can read their own orders"
ON orders FOR SELECT
USING (auth.uid()::text = user_id OR email = current_user_email());

-- Order items: Can read if user owns order
CREATE POLICY "Users can read their order items"
ON order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM orders
    WHERE auth.uid()::text = user_id
  )
);

-- Insert some sample products
INSERT INTO products (id, name, slug, description, price, category, stock_quantity) VALUES
('prod-1', 'Classic T-Shirt', 'classic-tshirt', 'Premium cotton t-shirt', 199, 'tshirts', 50),
('prod-2', 'Silk Shorts', 'silk-shorts', 'Comfortable silk shorts', 299, 'shorts', 30),
('prod-3', 'Elegant Dress', 'elegant-dress', 'Professional dress', 599, 'dresses', 20),
('prod-4', 'Casual Jacket', 'casual-jacket', 'Lightweight jacket', 699, 'jackets', 15),
('prod-5', 'Summer Blouse', 'summer-blouse', 'Light and breathable', 349, 'tops', 40),
('prod-6', 'Denim Jeans', 'denim-jeans', 'Classic denim', 449, 'bottoms', 35),
('prod-7', 'Wool Cardigan', 'wool-cardigan', 'Warm and cozy', 799, 'knitwear', 25),
('prod-8', 'Linen Pants', 'linen-pants', 'Summer comfort', 379, 'bottoms', 28);
