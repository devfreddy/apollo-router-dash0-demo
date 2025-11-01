/**
 * Configuration Loader Module
 *
 * Loads configuration files needed for dashboard conversion:
 * - metric type detection rules
 * - aggregation patterns documentation
 * - attribute name mappings
 * - Datadog dashboard template
 */

const fs = require('fs');
const path = require('path');

function loadConfigs() {
  // Load metric type detection rules
  const metricTypeRules = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'config', 'metric-types.json'), 'utf8')
  ).rules;

  // Load aggregation patterns documentation
  const aggregationPatterns = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'config', 'aggregation-patterns.json'), 'utf8')
  );

  // Load attribute name mappings
  const attributeMappings = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'config', 'attribute-mappings.json'), 'utf8')
  ).mappings;

  // Load the Datadog dashboard
  const datadogDashboard = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'datadog', 'graphos-template', 'graphos-template.json'), 'utf8')
  );

  return {
    metricTypeRules,
    aggregationPatterns,
    attributeMappings,
    datadogDashboard
  };
}

module.exports = {
  loadConfigs
};
