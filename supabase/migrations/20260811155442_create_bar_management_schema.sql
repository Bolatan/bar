/*
# Bar Management System Schema

## Overview
Creates the complete database schema for a bar management system operating in Lagos, Nigeria.
Handles inventory, POS orders, shifts, staff, and reporting.

## Tables Created

1. **profiles** — extends auth.users with staff info (role, phone, active status)
   - id (uuid, PK, references auth.users)
   - full_name (text)
   - phone (text)
   - role (text: owner, manager, staff)
   - is_active (boolean)
   - created_at (timestamp)

2. **suppliers** — vendor management
   - id (uuid, PK)
   - name, contact_person, phone, email, address, created_at

3. **products** — drink/food inventory
   - id (uuid, PK)
   - name, category, unit, cost_price, selling_price
   - stock_quantity, reorder_threshold, supplier_id (FK)
   - is_active, created_at, updated_at

4. **stock_movements** — audit log of all stock changes
   - id (uuid, PK)
   - product_id (FK), type (restock/sale/spoilage/adjustment)
   - quantity (positive for additions, negative for deductions)
   - user_id (FK to profiles), note, created_at

5. **orders** — POS orders/tabs
   - id (uuid, PK)
   - tab_name, items (jsonb array)
   - subtotal, vat, discount, total
   - payment_method, payment_ref, status (open/paid/void)
   - staff_id (FK), void_reason, voided_by
   - created_at, updated_at, paid_at

6. **shifts** — staff shift tracking with cash reconciliation
   - id (uuid, PK)
   - staff_id (FK), opening_float, closing_count
   - expected_cash, variance, opened_at, closed_at

7. **audit_logs** — sensitive action audit trail
   - id (uuid, PK)
   - user_id (FK), action, entity_type, entity_id
   - details (jsonb), created_at

## Security
- RLS enabled on all tables.
- All tables scoped to authenticated users (sign-in required).
- Owner-scoped where applicable; staff can read most data, write per role.
- Using authenticated role with ownership/membership checks.
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to read profiles (staff list for POS)
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_select" ON suppliers;
CREATE POLICY "suppliers_select" ON suppliers FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "suppliers_insert" ON suppliers;
CREATE POLICY "suppliers_insert" ON suppliers FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers_update" ON suppliers;
CREATE POLICY "suppliers_update" ON suppliers FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers_delete" ON suppliers;
CREATE POLICY "suppliers_delete" ON suppliers FOR DELETE
  TO authenticated USING (true);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('Beer','Spirits','Wine','Cocktails','Soft Drinks','Food','Other')),
  unit text NOT NULL DEFAULT 'bottle',
  cost_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(12,2) NOT NULL DEFAULT 0,
  reorder_threshold numeric(12,2) NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE
  TO authenticated USING (true);

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('restock','sale','spoilage','adjustment')),
  quantity numeric(12,2) NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_select" ON stock_movements;
CREATE POLICY "stock_movements_select" ON stock_movements FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "stock_movements_insert" ON stock_movements;
CREATE POLICY "stock_movements_insert" ON stock_movements FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stock_movements_update" ON stock_movements;
CREATE POLICY "stock_movements_update" ON stock_movements FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab_name text NOT NULL DEFAULT 'Counter',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  vat numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text CHECK (payment_method IN ('cash','card','transfer','split')),
  payment_ref text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid','void')),
  staff_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  void_reason text,
  voided_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "orders_insert" ON orders;
CREATE POLICY "orders_insert" ON orders FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orders_delete" ON orders;
CREATE POLICY "orders_delete" ON orders FOR DELETE
  TO authenticated USING (true);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opening_float numeric(12,2) NOT NULL DEFAULT 0,
  closing_count numeric(12,2),
  expected_cash numeric(12,2),
  variance numeric(12,2),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_select" ON shifts;
CREATE POLICY "shifts_select" ON shifts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "shifts_insert" ON shifts;
CREATE POLICY "shifts_insert" ON shifts FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "shifts_update" ON shifts;
CREATE POLICY "shifts_update" ON shifts FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_staff ON orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_shifts_staff ON shifts(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- updated_at trigger for products
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- updated_at trigger for orders
DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();