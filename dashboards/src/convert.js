#!/usr/bin/env node

/**
 * Converts Apollo Router Datadog dashboard to Dash0 Perses format
 *
 * Usage: node convert.js [--skip-markdown]
 *
 * Options:
 *   --skip-markdown   Generate dashboard without markdown/documentation panels
 *                     Output: apollo-router-no-docs.json
 *                     Default (no flag): apollo-router.json (with all panels)
 *
 * This script converts the Datadog dashboard while preserving the original
 * group structure from the source dashboard. The conversion process:
 * 1. Loads configuration and source data
 * 2. Iterates through top-level groups in the Datadog dashboard
 * 3. Converts widgets within each group to panels
 * 4. Creates layout groups corresponding to the original structure
 * 5. Writes the dashboard with all panels and layouts to output
 *
 * Key learnings for accurate dashboard conversion:
 * 1. Metric types must be correct (histogram vs gauge vs sum) - check actual OTel metrics
 * 2. Delta temporality must be configured in router.yaml for proper rate() calculations
 * 3. Attribute names in Dash0 differ from Datadog (e.g., 'kind' not 'apollo_router_cache_kind')
 * 4. Use histogram_quantile() for percentiles, not max() on raw histogram data
 * 5. Gauges don't need rate() - query them directly
 * 6. Histograms need rate() for time-series queries
 *
 * See the modular components for detailed documentation:
 * - config-loader.js - Configuration loading
 * - attribute-mapper.js - Datadog to Dash0 attribute mapping
 * - metric-type.js - Metric type detection
 * - promql-converter.js - Datadog to PromQL conversion logic
 * - widget-converter.js - Widget to panel conversion
 */

const fs = require('fs');
const path = require('path');

// Import modular components
const { loadConfigs } = require('./config-loader');
const { convertWidget } = require('./widget-converter');

// Parse command-line arguments
const skipMarkdown = process.argv.includes('--skip-markdown');

// Load all configurations and source data
const { metricTypeRules, attributeMappings, datadogDashboard } = loadConfigs();

/**
 * Convert Datadog dashboard to Dash0 Perses format, preserving group structure
 *
 * This function:
 * 1. Iterates through top-level widgets (which are groups)
 * 2. For each group, converts all nested widgets to panels
 * 3. Builds layout groups that match the original structure
 * 4. Returns a complete dashboard with all panels and layouts
 *
 * @param {boolean} skipMarkdown - If true, skip markdown/documentation panels
 */
function convertDashboard(skipMarkdown = false) {
  const allPanels = {};
  const layouts = [];
  let panelIndex = 0;

  // Process each top-level widget (typically a group)
  for (const widget of datadogDashboard.widgets) {
    const groupDef = widget.definition;

    // Skip image widgets
    if (groupDef.type === 'image') {
      continue;
    }

    // Get widgets from this group
    const groupWidgets = groupDef.widgets || [];
    const groupLayoutItems = [];
    let groupPanelCount = 0;

    // Convert each widget in the group to a panel
    for (const nestedWidget of groupWidgets) {
      const panelId = `panel_${panelIndex}`;
      const panel = convertWidget(nestedWidget, panelId, metricTypeRules, attributeMappings);

      if (!panel) {
        continue;
      }

      // Store panel metadata for layout processing, then clean it up before final output
      const isMarkdownPanel = panel._isMarkdownPanel;
      delete panel._isMarkdownPanel;
      delete panel._datadogLayout;

      // Skip markdown panels if requested
      if (skipMarkdown && isMarkdownPanel) {
        continue;
      }

      // Add panel to panels collection
      allPanels[panelId] = panel;

      // Get layout dimensions from Datadog widget (if available)
      // Scale from Datadog grid to Dash0 grid (2x scale factor)
      // Width: multiply by 2 (6 in Datadog = 12 in Dash0, 12 in Datadog = 24 in Dash0)
      // Height: multiply by 2 (2 in Datadog = 4 in Dash0, 6 in Datadog = 12 in Dash0)
      // X/Y positions: multiply by 2 to account for grid scaling
      const datadogLayout = nestedWidget.layout;
      let width = (datadogLayout?.width || 12) * 2;
      let height = (datadogLayout?.height || 8) * 2;
      const x = (datadogLayout?.x || 0) * 2;
      const y = (datadogLayout?.y || 0) * 2;

      // For markdown panels, ensure a minimum height of 12 units (at least as tall as other panels)
      // This makes documentation panels more readable and visually consistent
      if (isMarkdownPanel && height < 12) {
        height = 12;
      }

      groupLayoutItems.push({
        x,
        y,
        width,
        height,
        content: {
          $ref: `#/spec/panels/${panelId}`
        }
      });

      panelIndex++;
      groupPanelCount++;
    }

    // Only create a layout group if there are panels
    if (groupLayoutItems.length > 0) {
      layouts.push({
        kind: 'Grid',
        spec: {
          items: groupLayoutItems,
          display: {
            title: groupDef.title || 'Group',
            collapse: {
              open: true
            }
          }
        }
      });
    }
  }

  // Create the final dashboard in Dash0 Perses format
  const dashboardName = skipMarkdown
    ? 'Apollo Router - Dashboard (No Docs)'
    : 'Apollo Router - Complete Dashboard';
  const dashboardDescription = skipMarkdown
    ? 'GraphOS Runtime Dashboard - All metrics organized by functional area (documentation panels removed)'
    : 'GraphOS Runtime Dashboard - All metrics organized by functional area';

  return {
    apiVersion: 'perses.dev/v1alpha1',
    kind: 'PersesDashboard',
    metadata: {
      name: 'apollo-router',
      labels: {
        'dash0.com/dataset': 'apollo-router-demo'
      }
    },
    spec: {
      display: {
        name: dashboardName,
        description: dashboardDescription
      },
      duration: '1h',
      layouts: layouts,
      panels: allPanels
    }
  };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

// Run conversion
const dashboard = convertDashboard(skipMarkdown);

// Determine output filename based on skip-markdown flag
const outputFilename = skipMarkdown ? 'apollo-router-no-docs.json' : 'apollo-router.json';
const outputPath = path.join(__dirname, '..', 'dash0', 'apollo-router', outputFilename);
fs.writeFileSync(outputPath, JSON.stringify(dashboard, null, 2));

console.log(`✅ Dashboard converted successfully!`);
console.log(`📊 Panels created: ${Object.keys(dashboard.spec.panels).length}`);
console.log(`📊 Groups created: ${dashboard.spec.layouts.length}`);
console.log(`📁 Output: ${outputPath}`);

if (skipMarkdown) {
  console.log(`⏭️  Markdown panels skipped`);
}

console.log(`\n✨ All done!`);
console.log(`\nGenerated dashboard:`);
console.log(`  📊 ${outputFilename} - ${dashboard.spec.layouts.length} collapsible groups`);
console.log(`\nNext steps:`);
console.log(`1. Deploy to Dash0: ./dashboards/deploy.sh ${outputFilename}`);
console.log(`2. View in Dash0: https://app.dash0.com/dashboards/apollo-router`);
