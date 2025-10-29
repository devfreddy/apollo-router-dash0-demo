# Perses Dashboard Format Reference

## Overview

This document defines the Perses dashboard JSON format used by Dash0. Perses is a declarative dashboard-as-code format designed for cloud-native observability. It's fundamentally different from Grafana JSON (which Datadog also uses) because it's:

- **Language-agnostic**: Can be rendered by different backends
- **Composable**: Supports references and reusability
- **Declarative**: Describes what you want, not how to render it
- **Cloud-native**: Designed for Kubernetes and modern observability

**Perses Docs**: https://docs.perses.dev/

---

## Top-Level Dashboard Structure

### Minimal Dashboard

```json
{
  "kind": "Dashboard",
  "metadata": {
    "name": "my-dashboard"
  },
  "spec": {
    "display": {
      "name": "My Dashboard"
    },
    "layouts": [
      {
        "kind": "Grid",
        "spec": {
          "items": []
        }
      }
    ],
    "panels": {}
  }
}
```

### Complete Dashboard with All Fields

```json
{
  "kind": "Dashboard",
  "metadata": {
    "name": "apollo-router-performance",
    "displayName": "Apollo Router Performance Dashboard",
    "dash0Extensions": {
      "dataset": "default"
    }
  },
  "spec": {
    "display": {
      "name": "Apollo Router Performance",
      "description": "Monitor Apollo Router metrics and performance"
    },
    "duration": "1h",
    "refreshInterval": "30s",
    "variables": [],
    "layouts": [
      {
        "kind": "Grid",
        "spec": {
          "items": []
        }
      }
    ],
    "panels": {}
  }
}
```

---

## Metadata Section

### Kind
Always `"Dashboard"` for dashboard documents.

```json
"kind": "Dashboard"
```

### Metadata Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Identifier (lowercase, hyphens ok) |
| `displayName` | string | No | Human-readable name |
| `dash0Extensions` | object | No | Dash0-specific configuration |

### Name Formatting
- Lowercase letters and numbers
- Hyphens allowed
- No spaces or special characters
- Examples: `apollo-router-performance`, `cache-hit-ratio`

### Dash0 Extensions

```json
"dash0Extensions": {
  "dataset": "default"
}
```

**Fields**:
- `dataset`: Which data source/dataset to use (typically "default")

---

## Specification (spec) Section

### Core Fields

```json
"spec": {
  "display": { ... },           # Display metadata
  "duration": "1h",              # Default time range
  "refreshInterval": "30s",      # Auto-refresh rate
  "variables": [],               # Dashboard variables/filters
  "layouts": [ ... ],            # Layout definitions
  "panels": { ... }              # Panel definitions
}
```

### display

Configure how the dashboard is presented:

```json
"display": {
  "name": "Apollo Router Performance",
  "description": "GraphOS Runtime Dashboard - Converted from Datadog template"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Dashboard title (can have spaces) |
| `description` | string | Longer description shown in dashboard list |

### duration

Default time range for the dashboard:

```json
"duration": "1h"      # Last 1 hour
"duration": "6h"      # Last 6 hours
"duration": "24h"     # Last 24 hours
"duration": "7d"      # Last 7 days
"duration": "30d"     # Last 30 days
```

**Supported formats**:
- `Ns` - nanoseconds
- `us` - microseconds
- `ms` - milliseconds
- `s` - seconds
- `m` - minutes
- `h` - hours
- `d` - days

### refreshInterval

How often to auto-refresh the dashboard:

```json
"refreshInterval": "30s"      # Every 30 seconds
"refreshInterval": "1m"       # Every 1 minute
"refreshInterval": "5m"       # Every 5 minutes
"refreshInterval": "0"        # No auto-refresh
```

---

## Variables (Optional)

Dashboard variables allow filtering/parameterization. Currently optional for our dashboards.

```json
"variables": [
  {
    "name": "service",
    "default": {
      "value": "apollo-router"
    },
    "display": {
      "name": "Service"
    },
    "plugin": {
      "kind": "PrometheusVariableQuery",
      "spec": {
        "query": "label_values(up{job=\"apollo-router\"}, instance)"
      }
    }
  }
]
```

**Note**: Variables are complex; we're currently avoiding them in favor of explicit queries.

---

## Layouts Section

Defines how panels are arranged on the dashboard.

### Grid Layout (Most Common)

```json
"layouts": [
  {
    "kind": "Grid",
    "spec": {
      "items": [
        {
          "x": 0,
          "y": 0,
          "width": 12,
          "height": 8,
          "content": {
            "$ref": "#/spec/panels/panel_0"
          }
        }
      ]
    }
  }
]
```

### Layout Item Properties

| Property | Type | Description |
|----------|------|-------------|
| `x` | number | Horizontal position (0-based) |
| `y` | number | Vertical position (0-based) |
| `width` | number | Width in grid units (0-24) |
| `height` | number | Height in grid units |
| `content` | object | Panel reference or inline definition |

### Grid Coordinate System

- **Total width**: 24 units
- **Common layout**: 2 panels per row (12 units each)
- **Single panel**: 24 units wide
- **Three panels**: 8 units each

**Example 2-column layout**:
```
x: 0, y: 0, width: 12   │  x: 12, y: 0, width: 12
                        │
────────────────────────┼────────────────────────
x: 0, y: 8, width: 12   │  x: 12, y: 8, width: 12
```

### Panel References

Use `$ref` to reference a panel defined elsewhere:

```json
"content": {
  "$ref": "#/spec/panels/panel_name"
}
```

This allows:
- Reusing panel definitions
- Organizing panels separately from layout
- Referencing panels from external files (advanced)

---

## Panels Section

Defines all the panels used in the dashboard.

### Panel Structure

```json
"panels": {
  "panel_0": {
    "kind": "Panel",
    "spec": {
      "display": { ... },
      "plugin": { ... },
      "queries": [ ... ]
    }
  }
}
```

### Panel Definition

```json
{
  "kind": "Panel",
  "spec": {
    "display": {
      "name": "Request Throughput",
      "description": "Requests per second to the router"
    },
    "plugin": {
      "kind": "TimeSeriesChart",
      "spec": {}
    },
    "queries": [
      {
        "kind": "TimeSeriesQuery",
        "spec": { ... }
      }
    ]
  }
}
```

### display

Panel display metadata:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Panel title |
| `description` | string | Tooltip/help text |

### plugin

Determines how the panel is rendered.

#### TimeSeriesChart (Most Common)

For time-series graphs, line charts, area charts:

```json
"plugin": {
  "kind": "TimeSeriesChart",
  "spec": {
    "legend": {
      "position": "bottom",
      "values": ["value", "min", "max", "mean"]
    },
    "yAxis": {
      "scale": "linear"
    }
  }
}
```

**Options**:
- `legend.position`: `"bottom"`, `"top"`, `"right"`
- `legend.values`: Include legend values
- `yAxis.scale`: `"linear"`, `"logarithmic"`

#### StatChart

For single-value statistics (big numbers):

```json
"plugin": {
  "kind": "StatChart",
  "spec": {
    "format": "short",
    "thresholds": {
      "mode": "absolute",
      "values": [
        {
          "value": 80,
          "color": "red"
        }
      ]
    }
  }
}
```

**Common formats**:
- `"short"` - 1.2K, 5.6M, etc.
- `"long"` - Full number
- `"percent"` - As percentage
- `"percentunit"` - 0.0-1.0 range

#### PieChart

For proportional data:

```json
"plugin": {
  "kind": "PieChart",
  "spec": {}
}
```

#### GaugeChart

For current values with thresholds:

```json
"plugin": {
  "kind": "GaugeChart",
  "spec": {
    "thresholds": {
      "mode": "absolute",
      "values": [
        { "value": 50, "color": "yellow" },
        { "value": 80, "color": "red" }
      ]
    }
  }
}
```

#### BarChart

For categorical comparisons:

```json
"plugin": {
  "kind": "BarChart",
  "spec": {
    "direction": "vertical"
  }
}
```

**Directions**: `"vertical"`, `"horizontal"`

### queries

Array of queries that feed data to the panel.

```json
"queries": [
  {
    "kind": "TimeSeriesQuery",
    "spec": { ... }
  },
  {
    "kind": "TimeSeriesQuery",
    "spec": { ... }
  }
]
```

Most panels use one query, but multiple queries are supported for comparison.

---

## Query Definition

### TimeSeriesQuery Structure

```json
{
  "kind": "TimeSeriesQuery",
  "spec": {
    "display": {
      "name": "Request Rate"
    },
    "plugin": {
      "kind": "PrometheusTimeSeriesQuery",
      "spec": {
        "query": "sum by (http_status_code) (rate({...}[5m]))",
        "seriesNameFormat": "{{http_status_code}}"
      }
    }
  }
}
```

### Display (Query)

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Query name (shown in legend) |
| `description` | string | Query tooltip |

### Plugin (Query)

#### PrometheusTimeSeriesQuery

```json
"plugin": {
  "kind": "PrometheusTimeSeriesQuery",
  "spec": {
    "query": "promql_expression_here",
    "seriesNameFormat": "template_string",
    "interval": "30s",
    "step": "60s"
  }
}
```

**Fields**:
- `query`: PromQL expression (required)
- `seriesNameFormat`: How to label series in legend
  - `"{{metric_name}}"` - Use metric name
  - `"{{label_name}}"` - Use label value
  - `"Status {{http_status_code}}"` - Custom template
- `interval`: Query evaluation interval (optional)
- `step`: Points resolution (optional, rarely needed)

#### Series Name Format Examples

```
seriesNameFormat: "{{__name__}}"        # Metric name (e.g., "http_requests_total")
seriesNameFormat: "{{status_code}}"     # Label value (e.g., "200", "500")
seriesNameFormat: "{{job}}: {{instance}}"  # Multiple labels
seriesNameFormat: ""                    # Empty = use all labels
```

---

## Complete Panel Examples

### Example 1: Time Series Chart with Multiple Metrics

```json
"panels": {
  "request_throughput": {
    "kind": "Panel",
    "spec": {
      "display": {
        "name": "Request Throughput by Status",
        "description": "HTTP requests per second, grouped by response status code"
      },
      "plugin": {
        "kind": "TimeSeriesChart",
        "spec": {
          "legend": {
            "position": "bottom",
            "values": ["value", "min", "max"]
          }
        }
      },
      "queries": [
        {
          "kind": "TimeSeriesQuery",
          "spec": {
            "display": {
              "name": "Requests/sec by Status"
            },
            "plugin": {
              "kind": "PrometheusTimeSeriesQuery",
              "spec": {
                "query": "sum by (http_status_code) (rate({otel_metric_name=\"http_server_request_duration\",otel_metric_type=\"histogram\"}[5m]))",
                "seriesNameFormat": "{{http_status_code}}"
              }
            }
          }
        }
      ]
    }
  }
}
```

### Example 2: Stat Chart (Big Number)

```json
"panels": {
  "error_rate_percent": {
    "kind": "Panel",
    "spec": {
      "display": {
        "name": "Error Rate",
        "description": "Percentage of 4xx and 5xx responses"
      },
      "plugin": {
        "kind": "StatChart",
        "spec": {
          "format": "percent",
          "thresholds": {
            "mode": "absolute",
            "values": [
              { "value": 1.0, "color": "green" },
              { "value": 5.0, "color": "yellow" },
              { "value": 10.0, "color": "red" }
            ]
          }
        }
      },
      "queries": [
        {
          "kind": "TimeSeriesQuery",
          "spec": {
            "display": {
              "name": "Error Rate %"
            },
            "plugin": {
              "kind": "PrometheusTimeSeriesQuery",
              "spec": {
                "query": "(sum(rate({otel_metric_name=\"http_server_request_duration\",http_status_code=~\"4xx|5xx\"}[5m])) / sum(rate({otel_metric_name=\"http_server_request_duration\"}[5m]))) * 100"
              }
            }
          }
        }
      ]
    }
  }
}
```

### Example 3: Multiple Queries for Comparison

```json
"panels": {
  "cache_performance": {
    "kind": "Panel",
    "spec": {
      "display": {
        "name": "Cache Performance",
        "description": "Hit vs Miss times"
      },
      "plugin": {
        "kind": "TimeSeriesChart",
        "spec": {
          "legend": {
            "position": "bottom"
          }
        }
      },
      "queries": [
        {
          "kind": "TimeSeriesQuery",
          "spec": {
            "display": {
              "name": "Cache Hit Time (p95)"
            },
            "plugin": {
              "kind": "PrometheusTimeSeriesQuery",
              "spec": {
                "query": "histogram_quantile(0.95, sum by (kind, le) (rate({otel_metric_name=\"apollo_router_cache_hit_time\"}[5m])))"
              }
            }
          }
        },
        {
          "kind": "TimeSeriesQuery",
          "spec": {
            "display": {
              "name": "Cache Miss Time (p95)"
            },
            "plugin": {
              "kind": "PrometheusTimeSeriesQuery",
              "spec": {
                "query": "histogram_quantile(0.95, sum by (kind, le) (rate({otel_metric_name=\"apollo_router_cache_miss_time\"}[5m])))"
              }
            }
          }
        }
      ]
    }
  }
}
```

---

## Dash0 Extensions

Dash0 adds custom fields via the `dash0Extensions` object:

```json
{
  "kind": "Dashboard",
  "metadata": {
    "name": "apollo-router",
    "dash0Extensions": {
      "dataset": "default"
    }
  },
  "spec": { ... }
}
```

### dataset Field

Specifies which data source/dataset to query:

```json
"dash0Extensions": {
  "dataset": "default"         # Use default dataset
  "dataset": "prometheus"      # Or specific dataset name
}
```

---

## Complete Dashboard Example

Here's a minimal but complete dashboard:

```json
{
  "kind": "Dashboard",
  "metadata": {
    "name": "apollo-router-minimal",
    "dash0Extensions": {
      "dataset": "default"
    }
  },
  "spec": {
    "display": {
      "name": "Apollo Router - Minimal Example",
      "description": "Basic monitoring dashboard"
    },
    "duration": "1h",
    "refreshInterval": "30s",
    "layouts": [
      {
        "kind": "Grid",
        "spec": {
          "items": [
            {
              "x": 0,
              "y": 0,
              "width": 12,
              "height": 8,
              "content": {
                "$ref": "#/spec/panels/throughput"
              }
            },
            {
              "x": 12,
              "y": 0,
              "width": 12,
              "height": 8,
              "content": {
                "$ref": "#/spec/panels/error_rate"
              }
            }
          ]
        }
      }
    ],
    "panels": {
      "throughput": {
        "kind": "Panel",
        "spec": {
          "display": {
            "name": "Request Throughput"
          },
          "plugin": {
            "kind": "TimeSeriesChart",
            "spec": {}
          },
          "queries": [
            {
              "kind": "TimeSeriesQuery",
              "spec": {
                "display": {
                  "name": "Requests/sec"
                },
                "plugin": {
                  "kind": "PrometheusTimeSeriesQuery",
                  "spec": {
                    "query": "sum(rate({otel_metric_name=\"http_server_request_duration\"}[5m]))"
                  }
                }
              }
            }
          ]
        }
      },
      "error_rate": {
        "kind": "Panel",
        "spec": {
          "display": {
            "name": "Error Rate"
          },
          "plugin": {
            "kind": "StatChart",
            "spec": {
              "format": "percent"
            }
          },
          "queries": [
            {
              "kind": "TimeSeriesQuery",
              "spec": {
                "display": {
                  "name": "Error %"
                },
                "plugin": {
                  "kind": "PrometheusTimeSeriesQuery",
                  "spec": {
                    "query": "(sum(rate({otel_metric_name=\"http_server_request_duration\",http_status_code=~\"4xx|5xx\"}[5m])) / sum(rate({otel_metric_name=\"http_server_request_duration\"}[5m]))) * 100"
                  }
                }
              }
            }
          ]
        }
      }
    }
  }
}
```

---

## Best Practices for Dash0 Dashboards

1. **Use meaningful panel names**: "Request Throughput" not "metric1"
2. **Include descriptions**: Help future viewers understand the metric
3. **Consistent layout**: Use 2-column grid for consistency
4. **Group related metrics**: Put similar metrics near each other
5. **Use series name format**: Label lines in graphs for clarity
6. **Set appropriate refresh**: Balance responsiveness with load
7. **Use descriptive query names**: Show in legend what query produces the line
8. **Document unusual queries**: Add description if query logic is complex

---

## Conversion Checklist

When converting from Datadog to Perses:

- [ ] Set `kind: "Dashboard"`
- [ ] Create `metadata.name` (lowercase, hyphens)
- [ ] Add `dash0Extensions.dataset: "default"`
- [ ] Set `display.name` and `description`
- [ ] Choose appropriate `duration` (default: 1h)
- [ ] Set `refreshInterval` (default: 30s)
- [ ] Create `layouts[0].kind: "Grid"`
- [ ] Define all panels in `spec.panels`
- [ ] Create layout items with `$ref` references
- [ ] Convert each Datadog widget to a Perses panel
- [ ] Convert Datadog queries to PromQL
- [ ] Set panel plugin type (TimeSeriesChart, StatChart, etc.)
- [ ] Add query display names for legend
- [ ] Validate JSON syntax

---

## References

- **Perses Format Spec**: https://docs.perses.dev/
- **Dash0 Docs**: https://www.dash0.com/documentation/dash0/dashboards
- **Prometheus Query Language**: See PROMQL_REFERENCE.md
- **Datadog Format**: See DATADOG_QUERY_REFERENCE.md
