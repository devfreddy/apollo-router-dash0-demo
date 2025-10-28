#!/usr/bin/env node

/**
 * Creates a combined dashboard with collapsible groups
 *
 * Combines all 5 organized dashboards (Client Traffic, Backend, Internals, Infrastructure, Coprocessors)
 * into a single dashboard with expandable/collapsible groups.
 *
 * This uses Perses' Grid layout with display.title and collapse controls to create groups.
 */

const fs = require('fs');
const path = require('path');

// Load the organized dashboards
const dashboardsToLoad = [
  { file: 'client-traffic-dashboard.json', title: 'Client Traffic', order: 0 },
  { file: 'router-backend-dashboard.json', title: 'Backend Services', order: 1 },
  { file: 'router-internals-dashboard.json', title: 'Router Internals', order: 2 },
  { file: 'infrastructure-dashboard.json', title: 'Infrastructure', order: 3 },
  { file: 'coprocessors-dashboard.json', title: 'Coprocessors & Sentinel', order: 4 }
];

const dashboardDir = path.join(__dirname, 'dash0');
const dashboards = [];

// Load each organized dashboard
for (const dashConfig of dashboardsToLoad) {
  const filepath = path.join(dashboardDir, dashConfig.file);
  const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  dashboards.push({
    ...dashConfig,
    dashboard: content
  });
}

console.log(`✓ Loaded ${dashboards.length} dashboards`);

/**
 * Create combined dashboard with groups
 */
function createGroupedDashboard() {
  const allPanels = {};
  const layouts = [];

  // Process each dashboard as a group
  for (const dashConfig of dashboards) {
    const sourceDash = dashConfig.dashboard;
    const groupPanels = sourceDash.spec.panels;
    const sourceLayout = sourceDash.spec.layouts[0];

    // Copy all panels from this group
    Object.assign(allPanels, groupPanels);

    // Create a layout (group) with these panels
    const groupLayout = {
      kind: 'Grid',
      spec: {
        items: sourceLayout.spec.items,
        display: {
          title: dashConfig.title,
          collapse: {
            open: true  // Start expanded
          }
        }
      }
    };

    layouts.push(groupLayout);
  }

  // Create the combined dashboard
  const combinedDashboard = {
    kind: 'Dashboard',
    metadata: {
      name: 'apollo-router-complete',
      dash0Extensions: {
        dataset: 'default'
      }
    },
    spec: {
      display: {
        name: 'Apollo Router - Complete Dashboard',
        description: 'All Apollo Router metrics organized by functional area: Client Traffic, Backend Services, Router Internals, Infrastructure, and Coprocessors'
      },
      duration: '1h',
      refreshInterval: '30s',
      layouts: layouts,
      panels: allPanels
    }
  };

  return combinedDashboard;
}

// Create the dashboard
const combinedDashboard = createGroupedDashboard();

// Write output
const outputPath = path.join(dashboardDir, 'apollo-router-complete-grouped.json');
fs.writeFileSync(outputPath, JSON.stringify(combinedDashboard, null, 2));

console.log(`\n✓ Combined dashboard created successfully!`);
console.log(`📊 Total panels: ${Object.keys(combinedDashboard.spec.panels).length}`);
console.log(`📁 Output: ${outputPath}`);
console.log(`\n✨ Dashboard structure:`);
console.log(`   Group 1: Client Traffic (5 panels)`);
console.log(`   Group 2: Backend Services (6 panels)`);
console.log(`   Group 3: Router Internals (11 panels)`);
console.log(`   Group 4: Infrastructure (8 panels)`);
console.log(`   Group 5: Coprocessors & Sentinel (11 panels)`);
console.log(`\nNext steps:`);
console.log(`1. Import to Dash0: ./dashboards/deploy.sh`);
console.log(`2. Or view the file: cat ${outputPath}`);
