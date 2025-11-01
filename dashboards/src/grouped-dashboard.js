/**
 * Grouped Dashboard Module
 *
 * Create a grouped dashboard with collapsible sections based on functional areas
 *
 * This converts the flat panel list into a grouped layout where:
 * - Each group has a title and can be collapsed/expanded
 * - Panels are positioned within their group
 * - All panels are in the spec.panels section
 */

/**
 * Dashboard grouping configuration
 * Define how panels are organized into collapsible groups
 */
const groupConfiguration = [
  {
    title: 'Client Traffic',
    description: 'Client → Router request metrics',
    panelIndices: [0, 1, 2, 3, 4]
  },
  {
    title: 'Backend Services',
    description: 'Router → Backend (subgraph) request metrics',
    panelIndices: [5, 6, 7, 8, 9, 10]
  },
  {
    title: 'Router Internals',
    description: 'Query planning, cache, and compute jobs',
    panelIndices: [11, 12, 18, 19, 13, 14, 15, 16, 17, 20, 21]
  },
  {
    title: 'Infrastructure',
    description: 'Container, host, and Kubernetes metrics',
    panelIndices: [22, 23, 24, 25, 26, 27, 28, 29]
  },
  {
    title: 'Coprocessors & Sentinel',
    description: 'Coprocessor operations and system health',
    panelIndices: [30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
  }
];

/**
 * Create a grouped dashboard with collapsible sections
 */
function createGroupedDashboard(flatDashboard) {
  const allPanels = flatDashboard.spec.panels;
  const panelList = Object.entries(allPanels).map(([id, panel]) => ({ id, ...panel }));

  // Map panel indices to actual panel IDs
  const indexToPanelId = {};
  panelList.forEach((panel, index) => {
    indexToPanelId[index] = panel.id;
  });

  // Create layout groups
  const layouts = [];
  for (const group of groupConfiguration) {
    const groupPanels = [];
    let y = 0;

    // Add panels to this group
    for (let i = 0; i < group.panelIndices.length; i++) {
      const panelIndex = group.panelIndices[i];
      const panelId = indexToPanelId[panelIndex];

      if (!panelId) continue;

      const x = (i % 2) === 0 ? 0 : 12;
      if (i > 0 && (i % 2) === 0) y += 8;

      groupPanels.push({
        x,
        y,
        width: 12,
        height: 8,
        content: {
          $ref: `#/spec/panels/${panelId}`
        }
      });
    }

    layouts.push({
      kind: 'Grid',
      spec: {
        items: groupPanels,
        display: {
          title: group.title,
          collapse: {
            open: true
          }
        }
      }
    });
  }

  // Create grouped dashboard
  return {
    kind: 'Dashboard',
    metadata: {
      name: 'apollo-router',
      dash0Extensions: {
        dataset: 'apollo-router-demo'
      }
    },
    spec: {
      display: {
        name: 'Apollo Router - Complete Dashboard',
        description: 'GraphOS Runtime Dashboard - All metrics organized by functional area'
      },
      duration: '1h',
      refreshInterval: '30s',
      layouts: layouts,
      panels: allPanels
    }
  };
}

/**
 * Get the grouping configuration (useful for documentation)
 */
function getGroupConfiguration() {
  return groupConfiguration;
}

module.exports = {
  createGroupedDashboard,
  getGroupConfiguration,
  groupConfiguration
};
