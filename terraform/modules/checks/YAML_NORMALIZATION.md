# YAML Normalization and Drift Detection Strategy

## Problem

The Dash0 Terraform provider normalizes `check_rule_yaml` when it stores and retrieves PrometheusRule resources from the API. This causes perpetual drift detection:

- Input YAML: `for: 2m` → Stored as: `for: 2m0s`
- Input YAML: `metadata: { name: x }` → Retrieved as: Expanded structure
- Field ordering may change
- Whitespace/indentation differences

Even though the YAML is semantically identical after normalization, Terraform detects these formatting differences as changes on every `plan` run.

## Solution: Hybrid Approach

### 1. Extract YAML to External Files

YAML rules are now in separate files under `rules/`:
- `router-error-rate.yaml`
- `router-latency-p95.yaml`
- `router-latency-p99.yaml`
- `router-availability.yaml`
- `subgraph-latency.yaml`
- `subgraph-error-rate.yaml`

**Benefits:**
- YAML files are version-controlled and tracked in git
- You can see diffs when modifying rules
- Cleaner separation of concerns
- Easier to audit and review rule changes

### 2. Use `templatefile()` for Dynamic Values

Instead of inline heredoc strings, we now use `templatefile()` to substitute variables:

```hcl
check_rule_yaml = templatefile("${path.module}/rules/router-error-rate.yaml", {
  router_service_name           = var.router_service_name
  error_rate_threshold          = var.error_rate_threshold
  error_rate_threshold_critical = var.error_rate_threshold * 2
  environment                   = var.environment
})
```

**Benefits:**
- Thresholds can be adjusted from `.env` without editing YAML files
- Same rule template can be reused with different values
- Terraform can properly track variable-based changes

### 3. `lifecycle { ignore_changes = [check_rule_yaml] }` (Required)

We use `ignore_changes` because the **Dash0 API normalizes YAML when storing and retrieving it**, causing perpetual drift detection.

**Why it's necessary:**
- The API reformats YAML (adds apiVersion/kind, reorders fields, normalizes durations like `2m` → `2m0s`)
- Without `ignore_changes`, every `plan` shows changes even though nothing actually changed
- This is a **Dash0 provider limitation**, not a configuration issue

**How it works with templatefile():**
- Terraform compares the **templatefile INPUT** (your variables and YAML files), not the API response
- If you change `.env` thresholds → templatefile output changes → **Terraform detects the change** ✅
- If you edit YAML files → templatefile output changes → **Terraform detects the change** ✅
- Only the API's normalized response is ignored, preventing false drift

**We tested this:** Removing `ignore_changes` immediately caused perpetual drift to return.

## Updating Rules

### To change thresholds:
1. Edit `.env` file (e.g., `TERRAFORM_LATENCY_P95_MS=300`)
2. Run `cd terraform && ./terraform.sh apply`
3. Terraform will detect the change because `templatefile()` output changed
4. The rule will be updated

### To change rule logic:
1. Edit the YAML file in `rules/` (e.g., `rules/router-error-rate.yaml`)
2. Run `cd terraform && ./terraform.sh plan`
3. The plan will show changes only if the templatefile output actually differs
4. Run `cd terraform && ./terraform.sh apply` to deploy

**Note:** If you only reformat YAML (whitespace, field order) without changing the logic, the change won't be detected by Terraform. This is intentional—we're avoiding noise from API normalization.

## Detecting Real Changes

To verify if a rule change will be detected:
1. Check if the rendered template output changed
2. If thresholds changed: Yes, it will be detected (template output changed)
3. If only formatting changed: No, it won't (due to `ignore_changes`)

## Why YAML Formatting Alignment Isn't Enough

We attempted to align our YAML files with Dash0's normalized format (matching the state file exactly), but Terraform still detected changes. This suggests the Dash0 API's YAML normalization is either:
- Non-deterministic (varies between requests)
- Dependent on other factors (version, configuration, etc.)
- Applied at multiple layers in their system

Therefore, `ignore_changes` remains necessary until the Dash0 provider implements proper semantic YAML equality checking.

## Future Improvements

When the Dash0 provider adds semantic YAML equality checking:
1. Remove `lifecycle { ignore_changes = [check_rule_yaml] }`
2. Terraform will properly detect all real changes
3. No other code changes needed (rules and templates remain the same)

## References

- [Dash0 Provider Documentation](https://registry.terraform.io/providers/dash0hq/terraform-provider-dash0)
- [PrometheusRule Format](https://prometheus-operator.dev/docs/operator/designing-prometheusrules/)
- [Terraform templatefile()](https://www.terraform.io/language/functions/templatefile)
- [Terraform lifecycle ignore_changes](https://www.terraform.io/language/meta-arguments/lifecycle)
