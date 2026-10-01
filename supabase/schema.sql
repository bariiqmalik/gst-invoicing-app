-- =========================================================================
-- Supabase Schema for BillGST Pro Indian GST Invoicing App
-- Execute this script in your Supabase SQL Editor if you wish to use
-- Supabase PostgREST database storage instead of the built-in Express backend.
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Business Profiles Table
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  gstin TEXT,
  pan TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT DEFAULT 'Maharashtra',
  state_code TEXT DEFAULT '27',
  pincode TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  bank_details JSONB DEFAULT '{"bankName":"","accountHolder":"","accountNumber":"","ifscCode":"","branch":"","upiId":""}'::jsonb,
  invoice_prefix TEXT DEFAULT 'INV-',
  next_invoice_number INT DEFAULT 101,
  terms_and_conditions TEXT,
  default_notes TEXT,
  resend_api_key TEXT,
  resend_from_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT,
  name TEXT NOT NULL,
  company_name TEXT,
  gstin TEXT,
  is_b2b BOOLEAN DEFAULT false,
  email TEXT NOT NULL,
  phone TEXT,
  billing_address JSONB DEFAULT '{"street":"","city":"","state":"Maharashtra","stateCode":"27","pincode":""}'::jsonb,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Catalog Items Table
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'SERVICES',
  hsn_sac_code TEXT NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'NOS',
  default_gst_rate NUMERIC DEFAULT 18,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT,
  invoice_number TEXT NOT NULL,
  invoice_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  customer_id TEXT,
  customer_details JSONB DEFAULT '{}'::jsonb,
  place_of_supply TEXT NOT NULL,
  place_of_supply_state_code TEXT NOT NULL,
  is_inter_state BOOLEAN DEFAULT false,
  reverse_charge BOOLEAN DEFAULT false,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  terms_and_conditions TEXT,
  total_taxable_amount NUMERIC DEFAULT 0,
  total_cgst_amount NUMERIC DEFAULT 0,
  total_sgst_amount NUMERIC DEFAULT 0,
  total_igst_amount NUMERIC DEFAULT 0,
  total_tax_amount NUMERIC DEFAULT 0,
  round_off NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  total_in_words TEXT,
  status TEXT DEFAULT 'Sent',
  payment_details JSONB,
  email_delivery JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_ws ON public.business_profiles (workspace_id);
CREATE INDEX IF NOT EXISTS idx_customers_ws ON public.customers (workspace_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_ws ON public.catalog_items (workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_ws ON public.invoices (workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices (invoice_number);

-- Enable Row Level Security (RLS)
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Allow anonymous / authenticated access for demo / single-tenant PostgREST
CREATE POLICY "Allow public read access on business_profiles" ON public.business_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public write access on business_profiles" ON public.business_profiles FOR ALL USING (true);

CREATE POLICY "Allow public read access on customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Allow public write access on customers" ON public.customers FOR ALL USING (true);

CREATE POLICY "Allow public read access on catalog_items" ON public.catalog_items FOR SELECT USING (true);
CREATE POLICY "Allow public write access on catalog_items" ON public.catalog_items FOR ALL USING (true);

CREATE POLICY "Allow public read access on invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow public write access on invoices" ON public.invoices FOR ALL USING (true);
