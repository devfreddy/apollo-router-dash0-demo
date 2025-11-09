-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  warehouse VARCHAR(255) NOT NULL,
  estimated_delivery VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on product_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Insert initial data from the hardcoded inventory
INSERT INTO inventory (product_id, quantity, warehouse, estimated_delivery)
VALUES
  ('1', 15, 'West Coast', '3-5 days'),
  ('2', 42, 'East Coast', '2-4 days'),
  ('3', 128, 'Midwest', '2-3 days'),
  ('4', 0, 'West Coast', 'Out of stock'),
  ('5', 23, 'East Coast', '3-5 days')
ON CONFLICT (product_id) DO NOTHING;

-- Create a table for tracking inventory changes (audit log)
CREATE TABLE IF NOT EXISTS inventory_audit (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  warehouse VARCHAR(255),
  operation VARCHAR(50) NOT NULL,
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on product_id for audit log queries
CREATE INDEX IF NOT EXISTS idx_inventory_audit_product_id ON inventory_audit(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_performed_at ON inventory_audit(performed_at);
