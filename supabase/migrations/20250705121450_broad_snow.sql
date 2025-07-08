/*
  # Add support for multiple addresses and emails

  1. Schema Updates
    - Add addresses table for multiple customer addresses
    - Add customer_emails table for multiple customer emails
    - Keep existing address and email columns for backward compatibility

  2. New Tables
    - addresses: Store multiple addresses per customer
    - customer_emails: Store multiple emails per customer

  3. Security
    - Enable RLS and add policies for new tables
*/

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  address_name text,
  address text NOT NULL,
  city text NOT NULL,
  town text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create customer_emails table
CREATE TABLE IF NOT EXISTS customer_emails (
  id SERIAL PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_emails ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "public can manage addresses"
  ON addresses
  FOR ALL
  TO public;

CREATE POLICY "public can manage customer_emails"
  ON customer_emails
  FOR ALL
  TO public;