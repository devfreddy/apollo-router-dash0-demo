# Session Wrap-Up Workflow

This document describes the workflow Claude should follow when the user says "wrap this session up".

## Workflow Steps

When the user requests to wrap up the session, follow these steps:

### 1. Review Session Accomplishments
- Review what was accomplished during the session
- Identify key findings, configurations, or code changes
- Note any blockers or pending tasks

### 2. Create Session Directory and Files
- Create a new session directory: `docs/sessions/YYYY-MM-DD/`
- Create `docs/sessions/YYYY-MM-DD/notes.md` documenting this session's work
- Include:
  - What was accomplished
  - Configuration changes made
  - Key findings or learnings
  - Known issues discovered
  - Status of completed work
  - **Next Steps**: Concrete action items for the next session to pick up where we left off
  - TODOs for next session

### 3. Update COMMANDS.md (if applicable)
- Add any new shell commands that were run
- Document useful command patterns discovered
- Add troubleshooting commands if applicable
- Update the "Session Summary" section with new findings

### 4. Update README.md (if applicable)
- Update TODO list:
  - Mark completed items as ✅ done
  - Add new TODO items discovered during the session
  - Reference session notes for details on completed items
- Update "Session Notes" section with link to latest session
- Update project documentation if architecture or setup changed
- Add new features or capabilities to the overview

### 5. Commit and Push Changes
- Stage all documentation changes
- Create a comprehensive commit message that:
  - Summarizes the session accomplishments
  - Lists the files changed and why
  - Includes the Claude Code footer
- Push changes to remote repository

### 6. Create Session Wrap-Up Document
- Create `docs/sessions/YYYY-MM-DD/wrap-up.md` with:
  - Session summary
  - What was accomplished (high-level bullet points)
  - Key insights or learnings
  - Next steps for the next session (specific, actionable items)
  - Files modified during the session
  - Reference links to documentation or external resources
- This makes it easy to pick up where we left off in the next session

### 7. Create Session Summary
- Provide the user with a brief summary of:
  - What was accomplished
  - What was documented
  - Next steps or pending items
  - Any actions the user needs to take (e.g., restart services, reload VSCode)

## Example Session Wrap-Up

### Example docs/sessions/2025-10-11/notes.md

```markdown
# Session Notes - 2025-10-11

## Dash0 MCP Server Integration

### What Was Accomplished
- ✅ Researched Dash0 MCP server capabilities
- ✅ Configured MCP server endpoint with authentication
- ✅ Verified installation with `claude mcp list`
- ✅ Updated all project documentation

### Configuration Changes
- Added Dash0 MCP server to Claude Code configuration
- MCP endpoint: https://api.us-west-2.aws.dash0.com/mcp
- Authentication configured with Dash0 auth token

### Key Findings
- MCP server is fully hosted by Dash0 (no local setup needed)
- Requires VSCode reload to activate
- Supports PromQL queries and OpenTelemetry resource navigation

### Status
✅ MCP server configured and ready for use
⏳ Pending VSCode reload to activate MCP tools

### Next Steps
1. **Restart VSCode** to activate the Dash0 MCP server
2. **Verify MCP tools are available** by checking for new Dash0-related tools in Claude Code
3. **Test basic queries**:
   - Query list of services in Dash0
   - Retrieve metrics for Apollo Router
   - Investigate recent traces
4. **Explore capabilities**:
   - Test PromQL query building
   - Navigate OpenTelemetry resources
   - Investigate any active incidents or errors
5. **Document findings** in next session notes
```

### Example Session Summary (to user)

```markdown
# Session Summary - 2025-10-11

## Accomplished
- ✅ Configured Dash0 MCP server
- ✅ Updated all documentation files
- ✅ Committed and pushed changes

## Documentation Updated
- docs/sessions/2025-10-11/notes.md: Created with MCP server integration details
- docs/sessions/2025-10-11/wrap-up.md: Created with session summary
- COMMANDS.md: Added MCP configuration commands
- README.md: Updated TODO list and session notes section

## Next Steps (for next session)
1. Restart VSCode to activate MCP server
2. Verify MCP tools are available
3. Test basic queries (services, metrics, traces)
4. Explore PromQL and OpenTelemetry navigation features

## User Actions Required
- Restart VSCode window for MCP tools to become available
```

## Notes

- Always use the TodoWrite tool to track progress through these steps
- Be thorough but concise in documentation updates
- Link between documents where appropriate (e.g., README → SESSION_NOTES.md)
- Ensure commit messages are descriptive and follow the established format
- Don't forget to push changes to remote repository
