#!/usr/bin/env node

/**
 * Organizes the flat Dash0 dashboard into separate organized dashboards by section
 *
 * Creates:
 * - client-traffic-dashboard.json - Client → Router metrics
 * - router-backend-dashboard.json - Router → Backend (subgraph) metrics
 * - router-internals-dashboard.json - Query Planning, Cache, Compute Jobs
 * - infrastructure-dashboard.json - Container/Host metrics
 * - coprocessors-dashboard.json - Coprocessors and sentinel metrics
 */

const fs = require('fs');
const path = require('path');

// Load the monolithic Dash0 dashboard
const sourceDashboard = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'dash0', 'apollo-router-performance.json'), 'utf8')
);

// Panel organization mapping - matches the Datadog groupings
const dashboardOrganization = {
  'client-traffic-dashboard': {
    name: 'Apollo Router - Client Traffic',
    description: 'Client → Router request metrics including traffic, throughput, errors, and request characteristics',
    panels: ['panel_0', 'panel_1', 'panel_2', 'panel_3', 'panel_4'],
    layout: [
      { x: 0, y: 0, width: 12, height: 8 },
      { x: 12, y: 0, width: 12, height: 8 },
      { x: 0, y: 8, width: 12, height: 8 },
      { x: 12, y: 8, width: 12, height: 8 },
      { x: 0, y: 16, width: 12, height: 8 }
    ]
  },
  'router-backend-dashboard': {
    name: 'Apollo Router - Backend Services',
    description: 'Router → Backend (subgraph) request metrics including traffic, errors, and performance',
    panels: ['panel_5', 'panel_6', 'panel_7', 'panel_8', 'panel_9', 'panel_10'],
    layout: [
      { x: 0, y: 0, width: 12, height: 8 },
      { x: 12, y: 0, width: 12, height: 8 },
      { x: 0, y: 8, width: 12, height: 8 },
      { x: 12, y: 8, width: 12, height: 8 },
      { x: 0, y: 16, width: 12, height: 8 },
      { x: 12, y: 16, width: 12, height: 8 }
    ]
  },
  'router-internals-dashboard': {
    name: 'Apollo Router - Internals',
    description: 'Router internal operations: query planning, caching, and compute jobs',
    panels: [
      'panel_11', 'panel_12', 'panel_18', 'panel_19',  // Query Planning
      'panel_13', 'panel_14', 'panel_15', 'panel_16', 'panel_17',  // Cache
      'panel_20', 'panel_21'  // Compute Jobs
    ],
    layout: [
      // Query Planning section
      { x: 0, y: 0, width: 12, height: 8 },
      { x: 12, y: 0, width: 12, height: 8 },
      { x: 0, y: 8, width: 12, height: 8 },
      { x: 12, y: 8, width: 12, height: 8 },
      // Cache section
      { x: 0, y: 16, width: 12, height: 8 },
      { x: 12, y: 16, width: 12, height: 8 },
      { x: 0, y: 24, width: 12, height: 8 },
      { x: 12, y: 24, width: 12, height: 8 },
      { x: 0, y: 32, width: 12, height: 8 },
      // Compute Jobs section
      { x: 12, y: 32, width: 12, height: 8 },
      { x: 0, y: 40, width: 12, height: 8 }
    ]
  },
  'infrastructure-dashboard': {
    name: 'Apollo Router - Infrastructure',
    description: 'Container, host, and Kubernetes metrics for Apollo Router instances',
    panels: [
      'panel_22', 'panel_23', 'panel_24', 'panel_25',  // CPU metrics
      'panel_26', 'panel_27', 'panel_28', 'panel_29'   // Memory metrics
    ],
    layout: [
      // CPU metrics
      { x: 0, y: 0, width: 12, height: 8 },
      { x: 12, y: 0, width: 12, height: 8 },
      { x: 0, y: 8, width: 12, height: 8 },
      { x: 12, y: 8, width: 12, height: 8 },
      // Memory metrics
      { x: 0, y: 16, width: 12, height: 8 },
      { x: 12, y: 16, width: 12, height: 8 },
      { x: 0, y: 24, width: 12, height: 8 },
      { x: 12, y: 24, width: 12, height: 8 }
    ]
  },
  'coprocessors-dashboard': {
    name: 'Apollo Router - Coprocessors & Sentinel',
    description: 'Coprocessor operations and sentinel metrics for overall system health',
    panels: [
      'panel_30', 'panel_31', 'panel_32',  // Coprocessors
      'panel_33', 'panel_34', 'panel_35', 'panel_36', 'panel_37', 'panel_38', 'panel_39', 'panel_40'  // Sentinel metrics
    ],
    layout: [
      // Coprocessors
      { x: 0, y: 0, width: 12, height: 8 },
      { x: 12, y: 0, width: 12, height: 8 },
      { x: 0, y: 8, width: 12, height: 8 },
      // Sentinel metrics
      { x: 12, y: 8, width: 12, height: 8 },
      { x: 0, y: 16, width: 12, height: 8 },
      { x: 12, y: 16, width: 12, height: 8 },
      { x: 0, y: 24, width: 12, height: 8 },
      { x: 12, y: 24, width: 12, height: 8 },
      { x: 0, y: 32, width: 12, height: 8 },
      { x: 12, y: 32, width: 12, height: 8 },
      { x: 0, y: 40, width: 12, height: 8 }
    ]
  }
};

/**
 * Create a new dashboard with specified panels
 */
function createDashboard(dashboardConfig) {
  const newDashboard = {
    kind: 'Dashboard',
    metadata: {
      name: dashboardConfig.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
      dash0Extensions: {
        dataset: 'default'
      }
    },
    spec: {
      display: {
        name: dashboardConfig.name,
        description: dashboardConfig.description
      },
      duration: '1h',
      refreshInterval: '30s',
      layouts: [
        {
          kind: 'Grid',
          spec: {
            items: dashboardConfig.panels.map((panelKey, index) => ({
              x: dashboardConfig.layout[index].x,
              y: dashboardConfig.layout[index].y,
              width: dashboardConfig.layout[index].width,
              height: dashboardConfig.layout[index].height,
              content: {
                $ref: `#/spec/panels/${panelKey}`
              }
            }))
          }
        }
      ],
      panels: {}
    }
  };

  // Copy the referenced panels
  dashboardConfig.panels.forEach(panelKey => {
    newDashboard.spec.panels[panelKey] = sourceDashboard.spec.panels[panelKey];
  });

  return newDashboard;
}

// Create all dashboards
const dashboards = {};
for (const [filename, config] of Object.entries(dashboardOrganization)) {
  dashboards[filename] = createDashboard(config);
}

// Write dashboards to files
const outputDir = path.join(__dirname, 'dash0');
for (const [filename, dashboard] of Object.entries(dashboards)) {
  const filepath = path.join(outputDir, `${filename}.json`);
  fs.writeFileSync(filepath, JSON.stringify(dashboard, null, 2));
  console.log(`✓ Created ${filepath}`);
}

console.log('\n✓ Successfully created 5 organized dashboards!');
console.log('\nDashboards created:');
console.log('  1. client-traffic-dashboard.json - Client → Router metrics (5 panels)');
console.log('  2. router-backend-dashboard.json - Router → Backend metrics (6 panels)');
console.log('  3. router-internals-dashboard.json - Query Planning, Cache, Compute Jobs (11 panels)');
console.log('  4. infrastructure-dashboard.json - Container/Host metrics (8 panels)');
console.log('  5. coprocessors-dashboard.json - Coprocessors & Sentinel metrics (11 panels)');
