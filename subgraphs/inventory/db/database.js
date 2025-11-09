const Pool = require('pg-pool');
const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
const { trace } = require('@opentelemetry/api');

// Initialize PG instrumentation
const pgInstrumentation = new PgInstrumentation();
pgInstrumentation.enable();

const tracer = trace.getTracer('inventory-database');

// Create database connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || 'inventory_db',
  user: process.env.DATABASE_USER || 'inventory_user',
  password: process.env.DATABASE_PASSWORD || 'inventory_password',
  max: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool events
pool.on('connect', () => {
  console.log('✓ Database connection established');
});

pool.on('error', (err) => {
  console.error('✗ Database connection error:', err);
});

// Helper function to execute queries with tracing
async function executeQuery(query, params = []) {
  const span = tracer.startSpan(`db.query.${query.split(/\s+/)[0].toLowerCase()}`);

  try {
    span.setAttributes({
      'db.system': 'postgresql',
      'db.operation': query.split(/\s+/)[0].toUpperCase(),
      'db.statement': query.substring(0, 100),
      'db.sql.parameterized': params.length > 0 ? 'yes' : 'no',
    });

    const result = await pool.query(query, params);
    span.addEvent('query_success', { 'db.rows_affected': result.rowCount });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}

// Database functions for inventory operations

/**
 * Get inventory for a product by ID
 */
async function getInventory(productId) {
  const span = tracer.startSpan('getInventory');

  try {
    span.setAttribute('product.id', productId);

    const result = await executeQuery(
      'SELECT product_id, quantity, warehouse, estimated_delivery FROM inventory WHERE product_id = $1',
      [productId]
    );

    return result.rows[0] || null;
  } finally {
    span.end();
  }
}

/**
 * Get all inventory records
 */
async function getAllInventory() {
  return executeQuery('SELECT product_id, quantity, warehouse, estimated_delivery FROM inventory ORDER BY product_id');
}

/**
 * Update inventory quantity for a product
 */
async function updateInventory(productId, quantity, warehouse, estimatedDelivery) {
  const span = tracer.startSpan('updateInventory');

  try {
    span.setAttribute('product.id', productId);
    span.setAttribute('quantity', quantity);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current quantity for audit log
      const currentResult = await client.query(
        'SELECT quantity FROM inventory WHERE product_id = $1',
        [productId]
      );
      const quantityBefore = currentResult.rows[0]?.quantity || 0;

      // Update inventory
      const updateResult = await client.query(
        'UPDATE inventory SET quantity = $1, warehouse = $2, estimated_delivery = $3, updated_at = CURRENT_TIMESTAMP WHERE product_id = $4 RETURNING product_id, quantity, warehouse, estimated_delivery',
        [quantity, warehouse, estimatedDelivery, productId]
      );

      // Log to audit table
      if (updateResult.rowCount > 0) {
        await client.query(
          'INSERT INTO inventory_audit (product_id, quantity_before, quantity_after, warehouse, operation) VALUES ($1, $2, $3, $4, $5)',
          [productId, quantityBefore, quantity, warehouse, 'UPDATE']
        );
      }

      await client.query('COMMIT');
      return updateResult.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    span.end();
  }
}

/**
 * Adjust inventory quantity (increment/decrement)
 */
async function adjustInventory(productId, quantityDelta, reason = 'ADJUSTMENT') {
  const span = tracer.startSpan('adjustInventory');

  try {
    span.setAttribute('product.id', productId);
    span.setAttribute('quantity_delta', quantityDelta);
    span.setAttribute('reason', reason);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current state
      const currentResult = await client.query(
        'SELECT quantity, warehouse, estimated_delivery FROM inventory WHERE product_id = $1 FOR UPDATE',
        [productId]
      );

      if (currentResult.rowCount === 0) {
        throw new Error(`Product ${productId} not found in inventory`);
      }

      const current = currentResult.rows[0];
      const newQuantity = Math.max(0, current.quantity + quantityDelta);

      // Determine estimated delivery based on quantity
      let estimatedDelivery = current.estimated_delivery;
      if (newQuantity === 0) {
        estimatedDelivery = 'Out of stock';
      } else if (newQuantity < 10) {
        estimatedDelivery = '7-10 days';
      } else if (newQuantity < 50) {
        estimatedDelivery = '3-5 days';
      } else {
        estimatedDelivery = '2-3 days';
      }

      // Update inventory
      const updateResult = await client.query(
        'UPDATE inventory SET quantity = $1, estimated_delivery = $2, updated_at = CURRENT_TIMESTAMP WHERE product_id = $3 RETURNING product_id, quantity, warehouse, estimated_delivery',
        [newQuantity, estimatedDelivery, productId]
      );

      // Log to audit table
      await client.query(
        'INSERT INTO inventory_audit (product_id, quantity_before, quantity_after, warehouse, operation) VALUES ($1, $2, $3, $4, $5)',
        [productId, current.quantity, newQuantity, current.warehouse, reason]
      );

      await client.query('COMMIT');
      return updateResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } finally {
    span.end();
  }
}

/**
 * Health check - verify database connectivity
 */
async function healthCheck() {
  try {
    await pool.query('SELECT NOW()');
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Close the connection pool
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  executeQuery,
  getInventory,
  getAllInventory,
  updateInventory,
  adjustInventory,
  healthCheck,
  closePool,
};
