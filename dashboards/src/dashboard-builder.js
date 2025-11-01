/**
 * Dashboard Builder Module
 *
 * Creates a flat Dash0 dashboard in Perses format from converted panels
 */

/**
 * Build a flat dashboard from converted panels
 */
function buildFlatDashboard(panels) {
  // Create grid layout items (2 panels per row, 12 units each)
  const layoutItems = [];
  let x = 0, y = 0;

  for (const [panelId] of Object.entries(panels)) {
    layoutItems.push({
      x: x,
      y: y,
      width: 12,
      height: 8,
      content: {
        $ref: `#/spec/panels/${panelId}`
      }
    });

    // Move to next position
    x += 12;
    if (x >= 24) {
      x = 0;
      y += 8;
    }
  }

  // Create Dash0 dashboard in Perses format
  return {
    kind: 'Dashboard',
    metadata: {
      name: 'apollo-router-performance',
      dash0Extensions: {
        dataset: 'apollo-router-demo'
      }
    },
    spec: {
      display: {
        name: 'Apollo Router Performance',
        description: 'GraphOS Runtime Dashboard - Converted from Datadog template'
      },
      duration: '1h',
      refreshInterval: '30s',
      layouts: [
        {
          kind: 'Grid',
          spec: {
            items: layoutItems
          }
        }
      ],
      panels: panels
    }
  };
}

module.exports = {
  buildFlatDashboard
};
