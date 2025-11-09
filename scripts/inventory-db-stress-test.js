#!/usr/bin/env node

/**
 * Direct Database Stress Testing Script
 *
 * Tests database performance with various operations:
 * - INSERT/UPDATE/DELETE operations
 * - Concurrent transactions
 * - Audit log generation
 * - Connection pool behavior
 *
 * Usage:
 *   node scripts/inventory-db-stress-test.js [duration] [concurrency] [host] [port]
 *
 * Examples:
 *   node scripts/inventory-db-stress-test.js              # 60s, 10 concurrent, localhost
 *   node scripts/inventory-db-stress-test.js 120 20       # 120s, 20 concurrent
 *   node scripts/inventory-db-stress-test.js 60 5 postgres 5432
 */

const { Pool } = require('pg');

// Configuration
const DURATION_SECONDS = parseInt(process.argv[2] || '60', 10);
const CONCURRENCY = parseInt(process.argv[3] || '10', 10);
const DB_HOST = process.argv[4] || 'localhost';
const DB_PORT = parseInt(process.argv[5] || '5432', 10);
const DB_NAME = 'inventory_db';
const DB_USER = 'inventory_user';
const DB_PASSWORD = 'inventory_password';

const PRODUCT_IDS = ['1', '2', '3', '4', '5'];

// Create connection pool
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: CONCURRENCY + 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Metrics
const metrics = {
  totalOperations: 0,
  successfulOperations: 0,
  failedOperations: 0,
  totalDuration: 0,
  minDuration: Infinity,
  maxDuration: 0,
  operationTypes: {
    read: 0,
    update: 0,
    delete: 0,
    insert: 0,
  },
  errors: {},
};

/**
 * Test: Read inventory
 */
async function testRead(client) {
  const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];

  const query = 'SELECT * FROM inventory WHERE product_id = $1';
  const result = await client.query(query, [productId]);

  return result.rows.length > 0;
}

/**
 * Test: Update inventory quantity
 */
async function testUpdate(client) {
  const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
  const newQuantity = Math.floor(Math.random() * 200);

  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    // Get current for audit
    const currentResult = await client.query(
      'SELECT quantity FROM inventory WHERE product_id = $1',
      [productId]
    );

    if (currentResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    const quantityBefore = currentResult.rows[0].quantity;

    // Update inventory
    await client.query(
      'UPDATE inventory SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
      [newQuantity, productId]
    );

    // Log to audit table
    await client.query(
      'INSERT INTO inventory_audit (product_id, quantity_before, quantity_after, operation) VALUES ($1, $2, $3, $4)',
      [productId, quantityBefore, newQuantity, 'STRESS_TEST_UPDATE']
    );

    await client.query('COMMIT');
    return true;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore rollback errors
    }
    throw error;
  }
}

/**
 * Test: Delete and re-insert (simulating restocking)
 */
async function testDelete(client) {
  const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];

  await client.query('DELETE FROM inventory_audit WHERE product_id = $1', [productId]);

  return true;
}

/**
 * Test: Insert new audit record (simulating transaction activity)
 */
async function testInsertAudit(client) {
  const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
  const quantityDelta = Math.floor(Math.random() * 20) - 10;

  await client.query(
    'INSERT INTO inventory_audit (product_id, quantity_before, quantity_after, operation) VALUES ($1, $2, $3, $4)',
    [productId, Math.random() * 100, Math.random() * 100, 'STRESS_TEST_INSERT']
  );

  return true;
}

/**
 * Run a single database operation
 */
async function runOperation() {
  const client = await pool.connect();

  try {
    const operationType = Math.random();
    const startTime = Date.now();
    let success = false;
    let opType = 'read';

    if (operationType < 0.5) {
      // 50% reads
      success = await testRead(client);
      opType = 'read';
    } else if (operationType < 0.8) {
      // 30% updates
      success = await testUpdate(client);
      opType = 'update';
    } else if (operationType < 0.9) {
      // 10% deletes
      success = await testDelete(client);
      opType = 'delete';
    } else {
      // 10% inserts
      success = await testInsertAudit(client);
      opType = 'insert';
    }

    const duration = Date.now() - startTime;
    recordResult(duration, success, opType);
  } catch (error) {
    recordResult(0, false, 'error', error.message);
  } finally {
    client.release();
  }
}

/**
 * Record operation result
 */
function recordResult(duration, success, operationType, errorMessage = null) {
  metrics.totalOperations += 1;

  if (success) {
    metrics.successfulOperations += 1;
  } else {
    metrics.failedOperations += 1;
    if (errorMessage) {
      metrics.errors[errorMessage] = (metrics.errors[errorMessage] || 0) + 1;
    }
  }

  metrics.totalDuration += duration;
  metrics.minDuration = Math.min(metrics.minDuration, duration);
  metrics.maxDuration = Math.max(metrics.maxDuration, duration);
  metrics.operationTypes[operationType] = (metrics.operationTypes[operationType] || 0) + 1;
}

/**
 * Worker that continuously runs operations
 */
async function worker(workerId, endTime) {
  while (Date.now() < endTime) {
    try {
      await runOperation();
    } catch (error) {
      console.error(`Worker ${workerId} error:`, error.message);
    }
    // Minimal delay
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

/**
 * Format duration
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Print results
 */
function printResults() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 DATABASE STRESS TEST RESULTS');
  console.log('='.repeat(70));

  const avgDuration =
    metrics.totalOperations > 0 ? metrics.totalDuration / metrics.totalOperations : 0;
  const successRate =
    metrics.totalOperations > 0
      ? ((metrics.successfulOperations / metrics.totalOperations) * 100).toFixed(2)
      : 0;

  console.log(`\n⚙️  Test Configuration:`);
  console.log(`  Duration: ${DURATION_SECONDS}s`);
  console.log(`  Concurrency: ${CONCURRENCY} workers`);
  console.log(`  Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`);

  console.log(`\n📈 Results:`);
  console.log(`  Total Operations: ${metrics.totalOperations}`);
  console.log(`  Successful: ${metrics.successfulOperations} (${successRate}%)`);
  console.log(`  Failed: ${metrics.failedOperations}`);
  console.log(`  Operations/sec: ${(metrics.totalOperations / DURATION_SECONDS).toFixed(2)}`);

  console.log(`\n📊 Operation Breakdown:`);
  Object.entries(metrics.operationTypes).forEach(([type, count]) => {
    const percentage = metrics.totalOperations > 0 ? ((count / metrics.totalOperations) * 100).toFixed(1) : 0;
    console.log(`  ${type.padEnd(10)}: ${count.toString().padStart(6)} (${percentage}%)`);
  });

  console.log(`\n⏱️  Response Times:`);
  console.log(`  Min: ${formatDuration(metrics.minDuration)}`);
  console.log(`  Max: ${formatDuration(metrics.maxDuration)}`);
  console.log(`  Avg: ${formatDuration(avgDuration)}`);

  if (Object.keys(metrics.errors).length > 0) {
    console.log(`\n⚠️  Errors:`);
    Object.entries(metrics.errors).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });
  }

  console.log('\n' + '='.repeat(70));
}

/**
 * Main test runner
 */
async function main() {
  try {
    // Test connection
    const testClient = await pool.connect();
    const result = await testClient.query('SELECT NOW()');
    testClient.release();
    console.log('✓ Database connection verified\n');

    console.log('🚀 Starting Database Stress Test');
    console.log(`   Duration: ${DURATION_SECONDS}s`);
    console.log(`   Concurrency: ${CONCURRENCY} workers`);
    console.log(`   Database: ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}\n`);

    const endTime = Date.now() + DURATION_SECONDS * 1000;
    const workers = [];

    // Start workers
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(worker(i, endTime));
    }

    // Wait for completion
    await Promise.all(workers);

    // Print results
    printResults();

    // Cleanup
    await pool.end();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
main();
