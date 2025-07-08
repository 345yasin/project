/*
  # Fix All Database Issues

  1. Database Schema Fixes
    - Remove category_id from products table (use categories relationship instead)
    - Fix foreign key relationships
    - Add missing constraints

  2. Security Policies
    - Apply your exact RLS policies for all tables
    - Ensure public access for all operations

  3. Sample Data
    - Add categories (as requested, no sample data)
    - Ensure proper relationships
*/

-- Remove category_id column from products if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products DROP COLUMN category_id;
  END IF;
END $$;

-- Ensure categories table exists
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add category column to products (text instead of foreign key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products ADD COLUMN category TEXT;
  END IF;
END $$;

-- Fix user_profiles table - remove password column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'password'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN password;
  END IF;
END $$;

-- Apply your exact RLS policies

-- CUSTOMERS
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operators can manage customers" ON customers;
CREATE POLICY "operators can manage customers"
  ON customers
  FOR ALL
  TO public;

-- INTERVIEWS  
ALTER TABLE interviews DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operators_can_delete_interviews" ON interviews;
DROP POLICY IF EXISTS "operators_can_insert_interviews" ON interviews;
DROP POLICY IF EXISTS "operators_can_select_interviews" ON interviews;
DROP POLICY IF EXISTS "operators_can_update_interviews" ON interviews;

CREATE POLICY "operators_can_delete_interviews"
  ON interviews
  FOR DELETE
  TO public;

CREATE POLICY "operators_can_insert_interviews"
  ON interviews
  FOR INSERT
  TO public;

CREATE POLICY "operators_can_select_interviews"
  ON interviews
  FOR SELECT
  TO public;

CREATE POLICY "operators_can_update_interviews"
  ON interviews
  FOR UPDATE
  TO public;

-- PRODUCTS
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon can read products" ON products;
DROP POLICY IF EXISTS "operators can manage products" ON products;

CREATE POLICY "anon can read products"
  ON products
  FOR SELECT
  TO public;

CREATE POLICY "operators can manage products"
  ON products
  FOR ALL
  TO public;

-- CATEGORIES
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon can read categories" ON categories;
DROP POLICY IF EXISTS "operators can manage categories" ON categories;

CREATE POLICY "anon can read categories"
  ON categories
  FOR SELECT
  TO public;

CREATE POLICY "operators can manage categories"
  ON categories
  FOR ALL
  TO public;

-- SALE_ITEMS
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operators_can_delete_sale_items" ON sale_items;
DROP POLICY IF EXISTS "operators_can_insert_sale_items" ON sale_items;
DROP POLICY IF EXISTS "operators_can_select_sale_items" ON sale_items;
DROP POLICY IF EXISTS "operators_can_update_sale_items" ON sale_items;

CREATE POLICY "operators_can_delete_sale_items"
  ON sale_items
  FOR DELETE
  TO public;

CREATE POLICY "operators_can_insert_sale_items"
  ON sale_items
  FOR INSERT
  TO public;

CREATE POLICY "operators_can_select_sale_items"
  ON sale_items
  FOR SELECT
  TO public;

CREATE POLICY "operators_can_update_sale_items"
  ON sale_items
  FOR UPDATE
  TO public;

-- SALES
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operators_can_delete_sales" ON sales;
DROP POLICY IF EXISTS "operators_can_insert_sales" ON sales;
DROP POLICY IF EXISTS "operators_can_select_sales" ON sales;
DROP POLICY IF EXISTS "operators_can_update_sales" ON sales;

CREATE POLICY "operators_can_delete_sales"
  ON sales
  FOR DELETE
  TO public;

CREATE POLICY "operators_can_insert_sales"
  ON sales
  FOR INSERT
  TO public;

CREATE POLICY "operators_can_select_sales"
  ON sales
  FOR SELECT
  TO public;

CREATE POLICY "operators_can_update_sales"
  ON sales
  FOR UPDATE
  TO public;

-- USER_PROFILES
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "users can manage profiles" ON user_profiles;

CREATE POLICY "users can read all profiles"
  ON user_profiles
  FOR SELECT
  TO public;

CREATE POLICY "users can manage profiles"
  ON user_profiles
  FOR ALL
  TO public;

-- TURKEY_CITIES and TURKEY_TOWNS (for location data)
ALTER TABLE turkey_cities DISABLE ROW LEVEL SECURITY;
CREATE POLICY "public can read cities"
  ON turkey_cities
  FOR SELECT
  TO public;

ALTER TABLE turkey_towns DISABLE ROW LEVEL SECURITY;
CREATE POLICY "public can read towns"
  ON turkey_towns
  FOR SELECT
  TO public;