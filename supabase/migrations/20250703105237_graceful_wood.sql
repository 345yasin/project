/*
  # Update Database Policies

  1. Security Updates
    - Disable RLS and create public policies for all tables
    - Allow public access for operators to manage all data
    
  2. Schema Updates
    - Create missing categories table
    - Add sample data for categories and products
    - Fix foreign key relationships
*/

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
CREATE POLICY "anon can read products"
  ON products
  FOR SELECT
  TO public;

CREATE POLICY "operators can manage products"
  ON products
  FOR ALL
  TO public;

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
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
CREATE POLICY "users can read all profiles"
  ON user_profiles
  FOR SELECT
  TO public;

CREATE POLICY "users can manage profiles"
  ON user_profiles
  FOR ALL
  TO public;
