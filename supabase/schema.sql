-- AM Clothing store schema.
-- Run this once in the Supabase project's SQL editor, then run seed.sql.
-- Safe to re-run: every statement is guarded with "if not exists" / "or replace".

create extension if not exists pgcrypto;

-- ---------- products ----------
-- One row per color (e.g. am-tee-black, am-tee-white). Sizes live in product_variants
-- so stock can be tracked per size.
create table if not exists public.products (
  slug text primary key,
  title text not null,
  title_he text not null,
  category text not null check (category in ('tees', 'shorts', 'sets')),
  color text not null,
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price >= price),
  badge text,
  short text not null,
  description text not null,
  details jsonb not null default '[]'::jsonb,
  image_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id bigint generated always as identity primary key,
  product_slug text not null references public.products(slug) on delete cascade,
  size text not null check (size in ('S', 'M', 'L', 'XL', 'XXL')),
  stock integer not null default 0 check (stock >= 0),
  unique (product_slug, size)
);

-- Atomic stock decrement so two near-simultaneous webhook deliveries (Stripe
-- retries) can't double-subtract. Floors at 0 rather than erroring, since the
-- payment already happened by the time this runs.
create or replace function public.decrement_variant_stock(p_product_slug text, p_size text, p_quantity integer)
returns void
language sql
security definer set search_path = public
as $$
  update public.product_variants
  set stock = greatest(stock - p_quantity, 0)
  where product_slug = p_product_slug and size = p_size;
$$;

-- ---------- profiles ----------
-- Mirrors auth.users so we can flag an admin without touching Supabase's own table.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  -- Set on first checkout while signed in; lets /store/account send them to
  -- Stripe's own Customer Portal to view/replace/remove a saved card. We never
  -- store card numbers ourselves.
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists stripe_customer_id text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'canceled')),
  customer_email text,
  customer_name text,
  shipping_address jsonb,
  subtotal integer not null default 0,
  total integer not null default 0,
  currency text not null default 'ils',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_slug text not null references public.products(slug),
  title text not null,
  color text not null,
  size text not null,
  unit_price integer not null,
  quantity integer not null check (quantity > 0)
);

-- ---------- newsletter ----------
create table if not exists public.newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
-- Reads: catalog is public. Orders/profiles are only readable by their owner.
-- Writes: only the server (using the service-role key, which bypasses RLS) creates
-- orders, marks them paid, and adjusts stock — never the browser directly.
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.newsletter_subscribers enable row level security;

drop policy if exists "anyone can subscribe" on public.newsletter_subscribers;
create policy "anyone can subscribe" on public.newsletter_subscribers for insert with check (true);
-- No select policy: the list itself is only readable via the service-role key
-- (e.g. from /store/manage or an export script), never from the browser.

drop policy if exists "products are publicly readable" on public.products;
create policy "products are publicly readable" on public.products for select using (true);

drop policy if exists "variants are publicly readable" on public.product_variants;
create policy "variants are publicly readable" on public.product_variants for select using (true);

drop policy if exists "a user reads their own profile" on public.profiles;
create policy "a user reads their own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "a user reads their own orders" on public.orders;
create policy "a user reads their own orders" on public.orders for select using (auth.uid() = user_id);

drop policy if exists "a user reads their own order items" on public.order_items;
create policy "a user reads their own order items" on public.order_items for select using (
  exists (
    select 1 from public.orders
    where public.orders.id = order_items.order_id
    and public.orders.user_id = auth.uid()
  )
);

-- To make yourself an admin (lets you open /store/manage), run this after signing in once:
-- update public.profiles set is_admin = true where email = 'you@example.com';
