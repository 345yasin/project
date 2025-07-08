import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      addresses: {
        Row: {
          id: number;
          customer_id: string;
          address_name: string | null;
          address: string;
          city: string;
          town: string;
          is_primary: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          customer_id: string;
          address_name?: string | null;
          address: string;
          city: string;
          town: string;
          is_primary?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          customer_id?: string;
          address_name?: string | null;
          address?: string;
          city?: string;
          town?: string;
          is_primary?: boolean | null;
          created_at?: string;
        };
      };
      customer_emails: {
        Row: {
          id: number;
          customer_id: string;
          email: string;
          is_primary: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          customer_id: string;
          email: string;
          is_primary?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          customer_id?: string;
          email?: string;
          is_primary?: boolean | null;
          created_at?: string;
        };
      };
      categories: {
        Row: {
          id: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          surname: string;
          phone_numbers: string[] | null;
          industry: string | null;
          city: string;
          town: string;
          address_name: string | null;
          address: string;
          email: string | null;
          prev_orders: any | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          surname: string;
          phone_numbers?: string[] | null;
          industry?: string | null;
          city: string;
          town: string;
          address_name?: string | null;
          address: string;
          email?: string | null;
          prev_orders?: any | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          surname?: string;
          phone_numbers?: string[] | null;
          industry?: string | null;
          city?: string;
          town?: string;
          address_name?: string | null;
          address?: string;
          email?: string | null;
          prev_orders?: any | null;
          notes?: string | null;
        };
      };
      products: {
        Row: {
          id: number;
          name: string;
          price: number;
          image_url: string | null;
          category: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          price: number;
          image_url?: string | null;
          category?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          price?: number;
          image_url?: string | null;
          category?: string | null;
        };
      };
      interviews: {
        Row: {
          id: string;
          customer_id: string | null;
          operator: string;
          notes: string | null;
          sale_succeeded: boolean | null;
          interview_date: string | null;
          category_id: number | null;
          product_id: number | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          operator: string;
          notes?: string | null;
          sale_succeeded?: boolean | null;
          interview_date?: string | null;
          category_id?: number | null;
          product_id?: number | null;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          operator?: string;
          notes?: string | null;
          sale_succeeded?: boolean | null;
          interview_date?: string | null;
          category_id?: number | null;
          product_id?: number | null;
        };
      };
      sales: {
        Row: {
          id: string;
          customer_id: string | null;
          interview_id: string | null;
          sale_date: string | null;
          platform: string;
          shipping_cost: number | null;
          pay_method: string | null;
          is_canceled: boolean | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          interview_id?: string | null;
          sale_date?: string | null;
          platform: string;
          shipping_cost?: number | null;
          pay_method?: string | null;
          is_canceled?: boolean | null;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          interview_id?: string | null;
          sale_date?: string | null;
          platform?: string;
          shipping_cost?: number | null;
          pay_method?: string | null;
          is_canceled?: boolean | null;
        };
      };
      sale_items: {
        Row: {
          id: number;
          sale_id: string | null;
          product_id: number | null;
          quantity: number;
          unit_price: number;
        };
        Insert: {
          id?: number;
          sale_id?: string | null;
          product_id?: number | null;
          quantity: number;
          unit_price: number;
        };
        Update: {
          id?: number;
          sale_id?: string | null;
          product_id?: number | null;
          quantity?: number;
          unit_price?: number;
        };
      };
      turkey_cities: {
        Row: {
          id: number;
          name: string | null;
        };
        Insert: {
          id?: number;
          name?: string | null;
        };
        Update: {
          id?: number;
          name?: string | null;
        };
      };
      turkey_towns: {
        Row: {
          id: number;
          city_id: number | null;
          name: string | null;
        };
        Insert: {
          id?: number;
          city_id?: number | null;
          name?: string | null;
        };
        Update: {
          id?: number;
          city_id?: number | null;
          name?: string | null;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'admin' | 'user';
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          role?: 'admin' | 'user';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'admin' | 'user';
          created_at?: string;
        };
      };
    };
  };
};