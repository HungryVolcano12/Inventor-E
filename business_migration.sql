-- 1. Extend Roles (Drop and recreate constraint)
ALTER TABLE store_members DROP CONSTRAINT IF EXISTS store_members_role_check;
ALTER TABLE store_members ADD CONSTRAINT store_members_role_check CHECK (role IN ('owner', 'manager', 'staff', 'cashier'));

-- 2. Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and Managers can view audit logs" ON audit_logs FOR SELECT USING (
  store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid() AND role IN ('owner', 'manager'))
);

-- Trigger Function for Auditing
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (store_id, user_id, action_type, table_name, record_id, new_data)
    VALUES (NEW.store_id, auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (store_id, user_id, action_type, table_name, record_id, old_data, new_data)
    VALUES (NEW.store_id, auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (store_id, user_id, action_type, table_name, record_id, old_data)
    VALUES (OLD.store_id, auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Triggers
CREATE TRIGGER items_audit
AFTER INSERT OR UPDATE OR DELETE ON items
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER transactions_audit
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 3. Shifts Table
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  starting_cash NUMERIC DEFAULT 0,
  expected_cash NUMERIC DEFAULT 0,
  actual_cash NUMERIC,
  status TEXT CHECK (status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN'
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own shifts" ON shifts FOR ALL USING (
  store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
);

-- 4. Suppliers Table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alter Items to link Suppliers
ALTER TABLE items ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members access suppliers" ON suppliers FOR ALL USING (
  store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
);

-- 5. Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  points INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Alter Transactions to link Customers
ALTER TABLE transactions ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members access customers" ON customers FOR ALL USING (
  store_id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
);
