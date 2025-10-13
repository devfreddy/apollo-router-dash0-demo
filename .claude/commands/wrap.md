---
description: Wrap up the current session and generate documentation
---

# Session Wrap-Up Protocol

Execute the following streamlined session wrap-up procedure:

## 1. Update Session Documentation

Read and update the wrap-up document at `docs/sessions/YYYY-MM-DD/wrap-up.md` (today's date) with:

### Summary Section
- Brief overview of what was accomplished this session
- Key decisions made
- Any blockers encountered

### What Was Accomplished
- Detailed bullet points of completed work
- Features implemented or modified
- Documentation updates
- Infrastructure changes

### Next Steps
- **Immediate (Next Session)**: High priority items
- **Short Term**: Work for next few sessions
- **Long Term**: Future enhancements

### Other Sections (if applicable)
- **Prerequisites for Next Session**: Setup needed
- **Blockers**: Issues encountered and their status
- **Technical Debt**: Items to address later

## 2. Update Project Documentation (Only if Changed)

**Update only if relevant to this session's work:**

### README.md
- Update TODO section if new items completed or discovered
- Update "Session Notes" reference to point to latest session
- Add new capabilities to appropriate sections (Architecture, Features, etc.)
- Update configuration examples if changed

### Configuration Files
- Update comments in router/router.yaml if behavior changed
- Update .env.sample if new environment variables added
- Update docker-compose.yaml comments if service definitions changed

## 3. Review Git Status

Check what files were modified:
```bash
git status
git diff --stat
```

Identify any uncommitted changes that should be committed before wrap-up.

## 4. Commit Session Documentation

Stage and commit all documentation updates:
```bash
git add docs/
git commit -m "Session wrap-up: YYYY-MM-DD

Updated session documentation and project docs

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

## 5. Generate Session Summary

Provide the user with a concise summary:

### Format:
```markdown
# Session Complete - YYYY-MM-DD

## Delivered
- [User-visible change 1]
- [User-visible change 2]

## Technical Changes
- [Internal improvement 1]
- [Internal improvement 2]

## Documentation Updated
- [Doc 1]
- [Doc 2]

## Top 3 Priorities for Next Session
1. [Highest priority]
2. [Second priority]
3. [Third priority]

## Notes
- [Any important notes or warnings]
```

## Important Guidelines

- **Be selective**: Only update files that actually changed
- **Be concise**: Focus on "what" and "why", not just implementation details
- **Use links**: Include links to modified files using markdown format: [filename](path/to/file)
- **Update existing sections**: Don't create duplicate entries
- **Actionable next steps**: Ensure next steps are specific and implementable
- **Focus on session notes**: The session wrap-up is the primary artifact
- **Minimal overhead**: Don't update docs just for the sake of updating

## Notes for This Project

**Apollo Router Dash0 Demo - Simplified Structure:**
- Main README.md contains project overview, TODO list, and references
- Session notes in docs/sessions/YYYY-MM-DD/ are the primary documentation
- No separate feature tracking files (this is a demo, not a product)
- Configuration files are the source of truth for how things work
- Focus on: session wrap-ups, README updates, and inline config comments

**Result**: Minimal overhead, clear history, easy to pick up where you left off.
