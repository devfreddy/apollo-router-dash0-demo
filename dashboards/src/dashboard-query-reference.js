#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Extracts all queries from Dash0 dashboard and generates a searchable reference
 */
function extractDash0Queries() {
  const dashboardPath = path.join(__dirname, '../dash0/apollo-router/apollo-router.json');
  const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

  const sections = [];
  let panelCount = 0;

  // Group panels by layout section
  dashboard.spec.layouts.forEach((layout, layoutIndex) => {
    const section = {
      name: layout.spec.display.title,
      panels: [],
    };

    layout.spec.items.forEach((item) => {
      const panelRef = item.content.$ref.split('/').pop();
      const panelData = dashboard.spec.panels[panelRef];

      if (!panelData) return;

      const panelInfo = {
        id: panelRef,
        panelIndex: panelCount++,
        name: panelData.spec.display.name,
        queries: [],
      };

      // Extract all queries from this panel
      panelData.spec.queries.forEach((queryWrapper, queryIndex) => {
        const query = queryWrapper.spec.plugin.spec.query;
        const displayName = queryWrapper.spec.display.name;

        panelInfo.queries.push({
          index: queryIndex,
          displayName,
          query,
          metric: extractMetricName(query),
        });
      });

      section.panels.push(panelInfo);
    });

    sections.push(section);
  });

  return sections;
}

/**
 * Extracts all queries from Datadog dashboard and generates a searchable reference
 */
function extractDatadogQueries() {
  const dashboardPath = path.join(__dirname, '../datadog/graphos-template/graphos-template.json');
  const dashboard = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));

  const sections = [];
  let panelCount = 0;

  function processDashboard(widgets, parentGroup = null) {
    widgets.forEach((widget) => {
      if (widget.definition.type === 'group') {
        const groupName = widget.definition.title || 'Untitled Group';
        const section = {
          name: groupName,
          panels: [],
        };

        processDashboard(widget.definition.widgets, section);

        sections.push(section);
      } else if (
        widget.definition.type === 'timeseries' ||
        widget.definition.type === 'distribution' ||
        widget.definition.type === 'toplist' ||
        widget.definition.type === 'heatmap'
      ) {
        const panelInfo = {
          id: widget.id,
          panelIndex: panelCount++,
          name: widget.definition.title || 'Untitled Panel',
          queries: [],
        };

        if (widget.definition.requests) {
          widget.definition.requests.forEach((request, requestIndex) => {
            if (request.queries) {
              request.queries.forEach((queryObj, queryIndex) => {
                panelInfo.queries.push({
                  index: queryIndex,
                  displayName: queryObj.name || `Query ${queryIndex}`,
                  query: queryObj.query,
                  dataSource: queryObj.data_source,
                  metric: extractMetricNameDatadog(queryObj.query),
                });
              });
            }
          });
        }

        if (parentGroup) {
          parentGroup.panels.push(panelInfo);
        } else {
          const section = {
            name: 'Other Panels',
            panels: [panelInfo],
          };
          sections.push(section);
        }
      }
    });
  }

  processDashboard(dashboard.widgets);

  return sections;
}

/**
 * Extracts metric names from Dash0 PromQL queries
 */
function extractMetricName(query) {
  // Match patterns like otel_metric_name = "http.server.request.duration"
  const match = query.match(/otel_metric_name\s*=\s*"([^"]+)"/);
  return match ? match[1] : 'unknown';
}

/**
 * Extracts metric names from Datadog queries
 */
function extractMetricNameDatadog(query) {
  // Match patterns like count:http.server.request.duration or http.server.request.duration
  if (!query) return 'unknown';
  const match = query.match(/(?:count|avg|max|min|p\d+)?:?([a-zA-Z0-9._]+)/);
  return match ? match[1] : 'unknown';
}

/**
 * Generates a markdown reference document
 */
function generateMarkdownReference(dashboard, type) {
  let markdown = `# ${type} Dashboard Query Reference\n\n`;
  markdown += `**Generated**: ${new Date().toISOString()}\n\n`;
  markdown += `## Quick Navigation\n\n`;

  // Table of contents
  dashboard.forEach((section, sectionIndex) => {
    markdown += `- [${section.name}](#section-${sectionIndex})\n`;
  });

  markdown += '\n---\n\n';

  // Detailed sections
  dashboard.forEach((section, sectionIndex) => {
    markdown += `## Section ${sectionIndex}: ${section.name}\n\n`;
    markdown += `### Panels: ${section.panels.length}\n\n`;

    section.panels.forEach((panel) => {
      markdown += `#### Panel ${panel.panelIndex}: ${panel.name}\n`;
      markdown += `- **ID**: \`${panel.id}\`\n`;
      markdown += `- **Queries**: ${panel.queries.length}\n\n`;

      if (panel.queries.length > 0) {
        markdown += `##### Queries\n\n`;
        panel.queries.forEach((query, queryIdx) => {
          markdown += `**Query ${queryIdx}**: ${query.displayName}\n`;
          markdown += `- **Metric**: \`${query.metric}\`\n`;
          markdown += '```\n';
          markdown += query.query + '\n';
          markdown += '```\n\n';
        });
      }
    });

    markdown += '\n';
  });

  return markdown;
}

/**
 * Generates a CSV reference for easy searching
 */
function generateCSVReference(dashboard, type) {
  const rows = [];
  rows.push('Section,Panel Index,Panel Name,Query Index,Display Name,Metric,Query');

  dashboard.forEach((section) => {
    section.panels.forEach((panel) => {
      panel.queries.forEach((query) => {
        const queryStr = query.query || '';
        const row = [
          `"${section.name}"`,
          panel.panelIndex,
          `"${panel.name}"`,
          query.index,
          `"${query.displayName}"`,
          `"${query.metric}"`,
          `"${queryStr.replace(/"/g, '""')}"`, // Escape quotes
        ].join(',');
        rows.push(row);
      });
    });
  });

  return rows.join('\n');
}

/**
 * Generates a JSON index for programmatic access
 */
function generateJSONIndex(dashboard, type) {
  const index = {
    type,
    generatedAt: new Date().toISOString(),
    sections: dashboard.map((section) => ({
      name: section.name,
      panelCount: section.panels.length,
      panels: section.panels.map((panel) => ({
        id: panel.id,
        panelIndex: panel.panelIndex,
        name: panel.name,
        queryCount: panel.queries.length,
        metrics: [...new Set(panel.queries.map((q) => q.metric))],
        queries: panel.queries,
      })),
    })),
  };

  // Build a metrics index
  const metricsIndex = {};
  dashboard.forEach((section) => {
    section.panels.forEach((panel) => {
      panel.queries.forEach((query) => {
        if (!metricsIndex[query.metric]) {
          metricsIndex[query.metric] = [];
        }
        metricsIndex[query.metric].push({
          section: section.name,
          panel: panel.name,
          panelIndex: panel.panelIndex,
          displayName: query.displayName,
          query: query.query,
        });
      });
    });
  });

  index.metricsIndex = metricsIndex;

  return index;
}

/**
 * Main execution
 */
function main() {
  console.log('Generating dashboard query references...\n');

  // Extract Dash0 queries
  console.log('Extracting Dash0 queries...');
  const dash0Sections = extractDash0Queries();
  console.log(`✓ Found ${dash0Sections.length} sections`);

  const dash0TotalPanels = dash0Sections.reduce((sum, s) => sum + s.panels.length, 0);
  const dash0TotalQueries = dash0Sections.reduce(
    (sum, s) => sum + s.panels.reduce((ps, p) => ps + p.queries.length, 0),
    0
  );
  console.log(`✓ Found ${dash0TotalPanels} panels with ${dash0TotalQueries} queries\n`);

  // Extract Datadog queries
  console.log('Extracting Datadog queries...');
  const datadogSections = extractDatadogQueries();
  console.log(`✓ Found ${datadogSections.length} sections`);

  const ddTotalPanels = datadogSections.reduce((sum, s) => sum + s.panels.length, 0);
  const ddTotalQueries = datadogSections.reduce(
    (sum, s) => sum + s.panels.reduce((ps, p) => ps + p.queries.length, 0),
    0
  );
  console.log(`✓ Found ${ddTotalPanels} panels with ${ddTotalQueries} queries\n`);

  // Generate Dash0 references
  console.log('Generating Dash0 references...');

  const dash0Markdown = generateMarkdownReference(dash0Sections, 'Dash0');
  fs.writeFileSync(
    path.join(__dirname, '../dash0/apollo-router/QUERY_REFERENCE.md'),
    dash0Markdown
  );
  console.log('✓ Generated dash0/apollo-router/QUERY_REFERENCE.md');

  const dash0CSV = generateCSVReference(dash0Sections, 'Dash0');
  fs.writeFileSync(path.join(__dirname, '../dash0/apollo-router/queries.csv'), dash0CSV);
  console.log('✓ Generated dash0/apollo-router/queries.csv');

  const dash0JSON = generateJSONIndex(dash0Sections, 'Dash0');
  fs.writeFileSync(
    path.join(__dirname, '../dash0/apollo-router/queries-index.json'),
    JSON.stringify(dash0JSON, null, 2)
  );
  console.log('✓ Generated dash0/apollo-router/queries-index.json\n');

  // Generate Datadog references
  console.log('Generating Datadog references...');

  const datadogMarkdown = generateMarkdownReference(datadogSections, 'Datadog');
  fs.writeFileSync(
    path.join(__dirname, '../datadog/graphos-template/QUERY_REFERENCE.md'),
    datadogMarkdown
  );
  console.log('✓ Generated datadog/graphos-template/QUERY_REFERENCE.md');

  const datadogCSV = generateCSVReference(datadogSections, 'Datadog');
  fs.writeFileSync(path.join(__dirname, '../datadog/graphos-template/queries.csv'), datadogCSV);
  console.log('✓ Generated datadog/graphos-template/queries.csv');

  const datadogJSON = generateJSONIndex(datadogSections, 'Datadog');
  fs.writeFileSync(
    path.join(__dirname, '../datadog/graphos-template/queries-index.json'),
    JSON.stringify(datadogJSON, null, 2)
  );
  console.log('✓ Generated datadog/graphos-template/queries-index.json\n');

  console.log('✨ All query references generated successfully!');
}

main();
