#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Dashboard Query Lookup Tool
 * Search and filter queries across both Dash0 and Datadog dashboards
 */

const DASH0_INDEX = path.join(__dirname, '../dash0/apollo-router/queries-index.json');
const DATADOG_INDEX = path.join(__dirname, '../datadog/graphos-template/queries-index.json');

function loadIndex(dashboardType) {
  const indexPath = dashboardType === 'dash0' ? DASH0_INDEX : DATADOG_INDEX;
  if (!fs.existsSync(indexPath)) {
    console.error(`Error: ${indexPath} not found. Run "node src/dashboard-query-reference.js" first.`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
}

function findByMetric(dashboard, metric) {
  const matches = dashboard.metricsIndex[metric] || [];
  return matches;
}

function findByPanel(dashboard, panelName) {
  const results = [];
  dashboard.sections.forEach((section) => {
    section.panels.forEach((panel) => {
      if (panel.name.toLowerCase().includes(panelName.toLowerCase())) {
        results.push({
          section: section.name,
          panel: panel,
        });
      }
    });
  });
  return results;
}

function findByQuery(dashboard, queryText) {
  const results = [];
  dashboard.sections.forEach((section) => {
    section.panels.forEach((panel) => {
      panel.queries.forEach((query) => {
        if (query.query && query.query.toLowerCase().includes(queryText.toLowerCase())) {
          results.push({
            section: section.name,
            panel: panel.name,
            panelIndex: panel.panelIndex,
            displayName: query.displayName,
            query: query.query,
          });
        }
      });
    });
  });
  return results;
}

function printMetricResults(metric, results, dashboard) {
  if (results.length === 0) {
    console.log(`\n❌ No results found for metric: ${metric}`);
    console.log('\nAvailable metrics:');
    const metrics = Object.keys(dashboard.metricsIndex).sort();
    metrics.slice(0, 10).forEach((m) => console.log(`  - ${m}`));
    if (metrics.length > 10) {
      console.log(`  ... and ${metrics.length - 10} more`);
    }
    return;
  }

  console.log(`\n✓ Found ${results.length} occurrence(s) of metric: ${metric}\n`);
  results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.section} > ${result.panel}`);
    console.log(`   Display: ${result.displayName}`);
    console.log(`   Query: ${result.query.substring(0, 80)}${result.query.length > 80 ? '...' : ''}`);
    console.log();
  });
}

function printPanelResults(results) {
  if (results.length === 0) {
    console.log('\n❌ No panels found matching that name\n');
    return;
  }

  console.log(`\n✓ Found ${results.length} panel(s)\n`);
  results.forEach((result, idx) => {
    console.log(`${idx + 1}. [${result.section}] ${result.panel.name}`);
    console.log(`   ID: ${result.panel.id}`);
    console.log(`   Queries: ${result.panel.queryCount}`);
    console.log(`   Metrics: ${result.panel.metrics.join(', ')}`);
    console.log();
  });
}

function printQueryResults(results) {
  if (results.length === 0) {
    console.log('\n❌ No queries found containing that text\n');
    return;
  }

  console.log(`\n✓ Found ${results.length} query(ies)\n`);
  results.forEach((result, idx) => {
    console.log(`${idx + 1}. [${result.section}] ${result.panel}`);
    console.log(`   Display: ${result.displayName}`);
    console.log(`   Query: ${result.query}`);
    console.log();
  });
}

function listAllMetrics(dashboard) {
  const metrics = Object.keys(dashboard.metricsIndex).sort();
  console.log(`\n📊 All Metrics in Dashboard (${metrics.length} total)\n`);
  metrics.forEach((metric, idx) => {
    const count = dashboard.metricsIndex[metric].length;
    console.log(`${idx + 1}. ${metric} (${count} occurrence${count > 1 ? 's' : ''})`);
  });
  console.log();
}

function showHelp() {
  console.log(`
Dashboard Query Lookup Tool

Usage:
  node dashboard-query-lookup.js <command> [args]

Commands:
  metric <name>      Find all panels using a specific metric
  panel <name>       Find panels by name (partial match)
  query <text>       Find queries containing specific text
  metrics            List all available metrics
  compare            Compare metrics between Dash0 and Datadog
  help              Show this help message

Examples:
  node dashboard-query-lookup.js metric http.server.request.duration
  node dashboard-query-lookup.js panel "Error Rate"
  node dashboard-query-lookup.js query "histogram_quantile"
  node dashboard-query-lookup.js metrics
  node dashboard-query-lookup.js compare

Dashboard: Use 'dash0' or 'datadog' as the first argument to specify dashboard
Default: both dashboards are searched

Examples with explicit dashboard:
  node dashboard-query-lookup.js metric dash0 http.server.request.duration
  node dashboard-query-lookup.js panel datadog "Request Duration"
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
    showHelp();
    return;
  }

  let dashboardType = null;
  let command = args[0];
  let searchTerm = null;

  // Check if first arg is a dashboard type
  if (['dash0', 'datadog'].includes(args[0])) {
    dashboardType = args[0];
    command = args[1];
    searchTerm = args.slice(2).join(' ');
  } else {
    searchTerm = args.slice(1).join(' ');
  }

  // Handle commands
  switch (command) {
    case 'metric': {
      if (!searchTerm) {
        console.error('Error: Please provide a metric name\nUsage: metric <metric_name>');
        process.exit(1);
      }

      if (dashboardType) {
        const dashboard = loadIndex(dashboardType);
        const results = findByMetric(dashboard, searchTerm);
        printMetricResults(searchTerm, results, dashboard);
      } else {
        console.log('\n=== DASH0 ===');
        const dash0 = loadIndex('dash0');
        const dash0Results = findByMetric(dash0, searchTerm);
        printMetricResults(searchTerm, dash0Results, dash0);

        console.log('\n=== DATADOG ===');
        const datadog = loadIndex('datadog');
        const datadogResults = findByMetric(datadog, searchTerm);
        printMetricResults(searchTerm, datadogResults, datadog);
      }
      break;
    }

    case 'panel': {
      if (!searchTerm) {
        console.error('Error: Please provide a panel name\nUsage: panel <panel_name>');
        process.exit(1);
      }

      if (dashboardType) {
        const dashboard = loadIndex(dashboardType);
        const results = findByPanel(dashboard, searchTerm);
        printPanelResults(results);
      } else {
        console.log('\n=== DASH0 ===');
        const dash0 = loadIndex('dash0');
        const dash0Results = findByPanel(dash0, searchTerm);
        printPanelResults(dash0Results);

        console.log('\n=== DATADOG ===');
        const datadog = loadIndex('datadog');
        const datadogResults = findByPanel(datadog, searchTerm);
        printPanelResults(datadogResults);
      }
      break;
    }

    case 'query': {
      if (!searchTerm) {
        console.error('Error: Please provide query text\nUsage: query <text>');
        process.exit(1);
      }

      if (dashboardType) {
        const dashboard = loadIndex(dashboardType);
        const results = findByQuery(dashboard, searchTerm);
        printQueryResults(results);
      } else {
        console.log('\n=== DASH0 ===');
        const dash0 = loadIndex('dash0');
        const dash0Results = findByQuery(dash0, searchTerm);
        printQueryResults(dash0Results);

        console.log('\n=== DATADOG ===');
        const datadog = loadIndex('datadog');
        const datadogResults = findByQuery(datadog, searchTerm);
        printQueryResults(datadogResults);
      }
      break;
    }

    case 'metrics': {
      if (dashboardType) {
        const dashboard = loadIndex(dashboardType);
        listAllMetrics(dashboard);
      } else {
        console.log('=== DASH0 ===');
        const dash0 = loadIndex('dash0');
        listAllMetrics(dash0);

        console.log('\n=== DATADOG ===');
        const datadog = loadIndex('datadog');
        listAllMetrics(datadog);
      }
      break;
    }

    case 'compare': {
      const dash0 = loadIndex('dash0');
      const datadog = loadIndex('datadog');

      const dash0Metrics = new Set(Object.keys(dash0.metricsIndex));
      const datadogMetrics = new Set(Object.keys(datadog.metricsIndex));

      const onlyDash0 = [...dash0Metrics].filter((m) => !datadogMetrics.has(m));
      const onlyDatadog = [...datadogMetrics].filter((m) => !dash0Metrics.has(m));
      const common = [...dash0Metrics].filter((m) => datadogMetrics.has(m));

      console.log('\n📊 Metric Comparison\n');
      console.log(`Common metrics (${common.length}):`);
      common.sort().forEach((m) => console.log(`  ✓ ${m}`));

      console.log(`\nOnly in Dash0 (${onlyDash0.length}):`);
      onlyDash0.sort().forEach((m) => console.log(`  - ${m}`));

      console.log(`\nOnly in Datadog (${onlyDatadog.length}):`);
      onlyDatadog.sort().forEach((m) => console.log(`  - ${m}`));

      console.log();
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
