/**
 * Attribute Mapper Module
 *
 * Maps Datadog label names to Dash0 attribute names
 *
 * Rules:
 * 1. If attribute is in mappings table, use mapped name
 * 2. Otherwise, replace dots with underscores (e.g., 'http.status' -> 'http_status')
 *
 * See config/attribute-mappings.json for complete mapping table and rationale.
 * See docs/CONVERSION_MAPPINGS.md Table 3 for quick reference.
 */

function mapAttributeName(ddAttributeName, attributeMappings) {
  // Check if this attribute has an explicit mapping
  if (attributeMappings[ddAttributeName]) {
    return attributeMappings[ddAttributeName].dash0_name;
  }

  // Default: replace dots with underscores for PromQL compatibility
  return ddAttributeName.replace(/\./g, '_');
}

/**
 * Extract grouping attributes from Datadog query
 * Datadog supports two syntaxes for grouping:
 * 1. Explicit: by {label1, label2}
 * 2. Wildcard filter: label:* in the selector (means group by that label)
 * Returns: mapped attribute names
 */
function extractGroupBy(datadogQuery, attributeMappings) {
  // First try explicit 'by {}' syntax
  const byMatch = datadogQuery.match(/by \{([^}]+)\}/);
  if (byMatch) {
    return byMatch[1]
      .split(',')
      .map(attr => mapAttributeName(attr.trim(), attributeMappings))
      .join(', ');
  }

  // Second, look for wildcard filters like 'label:*' in the selector
  // These indicate grouping by that label
  const selectorMatch = datadogQuery.match(/\{([^}]+)\}/);
  if (selectorMatch) {
    const selector = selectorMatch[1];
    // Find all labels with :* pattern (wildcard grouping)
    const wildcardMatches = selector.match(/(\w+(?:\.\w+)*):(\*|\?)/g);
    if (wildcardMatches) {
      return wildcardMatches
        .map(match => {
          // Extract just the label name (before the : and wildcard)
          const labelName = match.split(':')[0];
          return mapAttributeName(labelName, attributeMappings);
        })
        .join(', ');
    }
  }

  return '';
}

module.exports = {
  mapAttributeName,
  extractGroupBy
};
