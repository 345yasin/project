-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.addresses (
  id integer NOT NULL DEFAULT nextval('addresses_id_seq'::regclass),
  customer_id uuid NOT NULL,
  address_name text,
  address text NOT NULL,
  city text NOT NULL,
  town text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT addresses_pkey PRIMARY KEY (id),
  CONSTRAINT addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.categories (
  id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customer_emails (
  id integer NOT NULL DEFAULT nextval('customer_emails_id_seq'::regclass),
  customer_id uuid NOT NULL,
  email text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customer_emails_pkey PRIMARY KEY (id),
  CONSTRAINT customer_emails_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  surname text NOT NULL,
  phone_numbers ARRAY,
  industry text,
  city text NOT NULL,
  town text NOT NULL,
  address_name text,
  address text NOT NULL,
  email text,
  prev_orders jsonb,
  notes text,
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  operator text NOT NULL,
  notes text,
  sale_succeeded boolean DEFAULT false,
  interview_date timestamp with time zone DEFAULT now(),
  category_id integer,
  product_id integer,
  CONSTRAINT interviews_pkey PRIMARY KEY (id),
  CONSTRAINT interviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT interviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.products (
  id integer NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  name text NOT NULL,
  price double precision NOT NULL,
  image_url text,
  category text,
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sale_items (
  id integer NOT NULL DEFAULT nextval('sale_items_id_seq'::regclass),
  sale_id uuid,
  product_id integer,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL,
  CONSTRAINT sale_items_pkey PRIMARY KEY (id),
  CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id),
  CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  interview_id uuid,
  sale_date timestamp with time zone DEFAULT now(),
  platform text NOT NULL CHECK (platform = ANY (ARRAY['phone'::text, 'f2f'::text, 'trendyol'::text, 'hepsiburada'::text, 'n11'::text])),
  shipping_cost numeric DEFAULT 0,
  pay_method text,
  is_canceled boolean DEFAULT false,
  CONSTRAINT sales_pkey PRIMARY KEY (id),
  CONSTRAINT sales_interview_id_fkey FOREIGN KEY (interview_id) REFERENCES public.interviews(id),
  CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.turkey_cities (
  id integer NOT NULL DEFAULT nextval('turkey_cities_id_seq'::regclass),
  name text,
  CONSTRAINT turkey_cities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.turkey_towns (
  id integer NOT NULL DEFAULT nextval('turkey_towns_id_seq'::regclass),
  city_id integer,
  name text,
  CONSTRAINT turkey_towns_pkey PRIMARY KEY (id),
  CONSTRAINT turkey_towns_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.turkey_cities(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'user'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);