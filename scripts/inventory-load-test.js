#!/usr/bin/env node

/**
 * Inventory Load Testing Script
 *
 * Tests the inventory subgraph with various load patterns:
 * - Random inventory adjustments (simulating sales/restocks)
 * - Concurrent read operations
 * - Write operations to test database performance
 *
 * Usage:
 *   node scripts/inventory-load-test.js [duration] [concurrency] [endpoint]
 *
 * Examples:
 *   node scripts/inventory-load-test.js                  # 60s, 10 concurrent, http://localhost:4000
 *   node scripts/inventory-load-test.js 120 20          # 120s, 20 concurrent
 *   node scripts/inventory-load-test.js 60 5 http://prod-router:4000
 */

const https = require('https');
const http = require('http');

// Configuration
const DURATION_SECONDS = parseInt(process.argv[2] || '60', 10);
const CONCURRENCY = parseInt(process.argv[3] || '10', 10);
const ENDPOINT = process.argv[4] || 'http://localhost:4000/graphql';
const PRODUCT_IDS = ['1', '2', '3', '4', '5'];

// Test metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalDuration: 0,
  minDuration: Infinity,
  maxDuration: 0,
  errors: {},
};

/**
 * Execute a GraphQL query
 */
async function executeGraphQL(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(ENDPOINT);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const payload = JSON.stringify({
      query,
      variables,
    });

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const startTime = Date.now();

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;

        try {
          const response = JSON.parse(data);
          resolve({ response, duration, statusCode: res.statusCode });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Test: Read inventory for a random product
 */
async function testReadInventory() {
  const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];

  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        inventory {
          quantity
          warehouse
          estimatedDelivery
        }
      }
    }
  `;

  return executeGraphQL(query, { id: productId });
}

/**
 * Test: Multiple product reads in one query
 */
async function testMultiProductRead() {
  const query = `
    query GetAllInventory {
      topProducts {
        id
        inventory {
          quantity
          warehouse
          estimatedDelivery
        }
      }
    }
  `;

  return executeGraphQL(query);
}

/**
 * Test: Simulate a purchase (inventory adjustment via mutation - requires router mutation support)
 * Note: This would require extending the inventory subgraph with mutations
 */
async function testInventoryMutation() {
  const productId = PRODUCT_IDS[Math.floor(Math.random() * PRODUCT_IDS.length)];
  const quantity = Math.floor(Math.random() * 10) + 1;

  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        inventory {
          quantity
          warehouse
          estimatedDelivery
        }
      }
    }
  `;

  return executeGraphQL(query, { id: productId });
}

/**
 * Record test result and update metrics
 */
function recordResult(duration, success, error = null) {
  metrics.totalRequests += 1;

  if (success) {
    metrics.successfulRequests += 1;
  } else {
    metrics.failedRequests += 1;
    if (error) {
      metrics.errors[error] = (metrics.errors[error] || 0) + 1;
    }
  }

  metrics.totalDuration += duration;
  metrics.minDuration = Math.min(metrics.minDuration, duration);
  metrics.maxDuration = Math.max(metrics.maxDuration, duration);
}

/**
 * Run a single test operation
 */
async function runTest() {
  const testType = Math.random();

  try {
    let result;

    if (testType < 0.6) {
      // 60% read single product
      result = await testReadInventory();
    } else if (testType < 0.9) {
      // 30% read multiple products
      result = await testMultiProductRead();
    } else {
      // 10% mutation-style operations
      result = await testInventoryMutation();
    }

    const success = result.statusCode === 200 && !result.response.errors;
    recordResult(result.duration, success, result.response.errors?.[0]?.message);
  } catch (error) {
    recordResult(0, false, error.message);
  }
}

/**
 * Worker that continuously runs tests for the specified duration
 */
async function worker(workerId, endTime) {
  while (Date.now() < endTime) {
    await runTest();
    // Small delay to avoid overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * Format duration for display
 */
function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Print test results
 */
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 INVENTORY LOAD TEST RESULTS');
  console.log('='.repeat(60));

  const avgDuration =
    metrics.totalRequests > 0 ? metrics.totalDuration / metrics.totalRequests : 0;
  const successRate =
    metrics.totalRequests > 0
      ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)
      : 0;

  console.log(`\n📈 Test Configuration:`);
  console.log(`  Duration: ${DURATION_SECONDS}s`);
  console.log(`  Concurrency: ${CONCURRENCY} workers`);
  console.log(`  Endpoint: ${ENDPOINT}`);

  console.log(`\n📊 Results:`);
  console.log(`  Total Requests: ${metrics.totalRequests}`);
  console.log(`  Successful: ${metrics.successfulRequests} (${successRate}%)`);
  console.log(`  Failed: ${metrics.failedRequests}`);
  console.log(`  Requests/sec: ${(metrics.totalRequests / DURATION_SECONDS).toFixed(2)}`);

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

  console.log('\n' + '='.repeat(60));
}

/**
 * Main test runner
 */
async function main() {
  console.log('🚀 Starting Inventory Load Test');
  console.log(`   Duration: ${DURATION_SECONDS}s`);
  console.log(`   Concurrency: ${CONCURRENCY} workers`);
  console.log(`   Endpoint: ${ENDPOINT}\n`);

  const endTime = Date.now() + DURATION_SECONDS * 1000;
  const workers = [];

  // Start worker processes
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(i, endTime));
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  // Print results
  printResults();
}

// Run the test
main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
