-- ============================================================
-- Multi-tenancy: Organizations
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Organizations table (no RLS policies yet — function depends on profiles.organization_id)
CREATE TABLE organizations (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Add organization_id to profiles FIRST (needed by get_current_user_org_id function)
ALTER TABLE profiles ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

-- 3. Helper function (now profiles.organization_id exists, so SQL body is valid)
CREATE OR REPLACE FUNCTION get_current_user_org_id()
RETURNS uuid AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Now enable RLS + policies on organizations (function exists now)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org"
  ON organizations FOR SELECT TO authenticated
  USING (id = get_current_user_org_id());

CREATE POLICY "Admins can update own org"
  ON organizations FOR UPDATE TO authenticated
  USING (id = get_current_user_org_id() AND get_current_user_role() = 'admin');

-- 5. Add organization_id to all other data tables
ALTER TABLE categories         ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE locations          ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE suppliers          ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE inventory_items    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE inventory_transactions ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE buildings          ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE projects           ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE purchase_orders    ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE work_orders        ADD COLUMN organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- 6. Replace global unique constraints with org-scoped ones
ALTER TABLE categories     DROP CONSTRAINT IF EXISTS categories_name_key;
ALTER TABLE locations      DROP CONSTRAINT IF EXISTS locations_name_key;
ALTER TABLE suppliers      DROP CONSTRAINT IF EXISTS suppliers_name_key;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_sku_key;
ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_upc_key;

ALTER TABLE categories     ADD CONSTRAINT categories_org_name_key    UNIQUE (organization_id, name);
ALTER TABLE locations      ADD CONSTRAINT locations_org_name_key      UNIQUE (organization_id, name);
ALTER TABLE suppliers      ADD CONSTRAINT suppliers_org_name_key      UNIQUE (organization_id, name);
ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_org_sku_key UNIQUE (organization_id, sku);

-- 7. Create a default org for any existing profiles without one
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE organization_id IS NULL) THEN
    INSERT INTO organizations (name) VALUES ('My Organization')
    RETURNING id INTO default_org_id;
    UPDATE profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- 8. Update RLS policies to scope by org

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT TO authenticated
  USING (organization_id = get_current_user_org_id() OR id = auth.uid());

-- Categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
CREATE POLICY "Users can view org categories"
  ON categories FOR SELECT TO authenticated USING (organization_id = get_current_user_org_id());
CREATE POLICY "Admins can insert org categories"
  ON categories FOR INSERT TO authenticated WITH CHECK (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can update org categories"
  ON categories FOR UPDATE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can delete org categories"
  ON categories FOR DELETE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');

-- Locations
DROP POLICY IF EXISTS "Authenticated users can view locations" ON locations;
DROP POLICY IF EXISTS "Admins can insert locations" ON locations;
DROP POLICY IF EXISTS "Admins can update locations" ON locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON locations;
CREATE POLICY "Users can view org locations"
  ON locations FOR SELECT TO authenticated USING (organization_id = get_current_user_org_id());
CREATE POLICY "Admins can insert org locations"
  ON locations FOR INSERT TO authenticated WITH CHECK (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can update org locations"
  ON locations FOR UPDATE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can delete org locations"
  ON locations FOR DELETE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');

-- Suppliers
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON suppliers;
CREATE POLICY "Users can view org suppliers"
  ON suppliers FOR SELECT TO authenticated USING (organization_id = get_current_user_org_id());
CREATE POLICY "Admins can insert org suppliers"
  ON suppliers FOR INSERT TO authenticated WITH CHECK (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can update org suppliers"
  ON suppliers FOR UPDATE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can delete org suppliers"
  ON suppliers FOR DELETE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');

-- Inventory items
DROP POLICY IF EXISTS "Authenticated users can view inventory" ON inventory_items;
DROP POLICY IF EXISTS "Admins can insert inventory" ON inventory_items;
DROP POLICY IF EXISTS "Admins can update inventory" ON inventory_items;
DROP POLICY IF EXISTS "Admins can delete inventory" ON inventory_items;
CREATE POLICY "Users can view org inventory"
  ON inventory_items FOR SELECT TO authenticated USING (organization_id = get_current_user_org_id());
CREATE POLICY "Admins can insert org inventory"
  ON inventory_items FOR INSERT TO authenticated WITH CHECK (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can update org inventory"
  ON inventory_items FOR UPDATE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');
CREATE POLICY "Admins can delete org inventory"
  ON inventory_items FOR DELETE TO authenticated USING (organization_id = get_current_user_org_id() AND get_current_user_role() = 'admin');

-- Transactions
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Staff and Admins can insert transactions" ON inventory_transactions;
CREATE POLICY "Users can view org transactions"
  ON inventory_transactions FOR SELECT TO authenticated USING (organization_id = get_current_user_org_id());
CREATE POLICY "Staff can insert org transactions"
  ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (organization_id = get_current_user_org_id() AND get_current_user_role() IN ('admin', 'staff'));

-- 9. Update handle_new_user to accept org from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, organization_id)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN new.raw_user_meta_data->>'role' IN ('admin','staff','viewer')
      THEN (new.raw_user_meta_data->>'role')::user_role
      ELSE 'viewer'::user_role
    END,
    CASE
      WHEN new.raw_user_meta_data->>'organization_id' IS NOT NULL
        AND new.raw_user_meta_data->>'organization_id' != ''
      THEN (new.raw_user_meta_data->>'organization_id')::uuid
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
