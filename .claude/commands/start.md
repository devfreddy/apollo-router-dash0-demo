---
description: Start a new session with context from recent work
---

# Session Startup

Initialize a new work session by loading relevant context from the project.

## Tasks to Complete

1. **Check Project Configuration**
   - Read `.claude/project-config.yaml`
   - Note the project type and preferences

2. **Review Recent Session**
   - Find the most recent session in `docs/sessions/`
   - Read the wrap-up document from that session
   - Pay attention to "Next Steps" section
   - Identify any unfinished work

3. **Check Project Status**
   - Read `README.md` for current project state
   - Check the TODO section for pending work
   - Review recent commits mentioned in README
   - Note the latest session reference

4. **Check Current Stack Status**
   - Review docker-compose status if relevant
   - Note any configuration changes needed
   - Check for environment setup requirements

5. **Check for Blockers**
   - Look for any blockers noted in recent session docs
   - Check session notes for known issues

6. **Present Context to User**

Provide a summary in this format:

```markdown
# Session Started - YYYY-MM-DD

## Last Session Summary
[Brief summary of what was done last time from docs/sessions/YYYY-MM-DD/wrap-up.md]

## Completed Work
- [Recent accomplishments from README TODO section]

## Remaining Work
- [Uncompleted items from README TODO section or last session next steps]

## Current Project State
- Router: [Status]
- Subgraphs: [Status]
- Observability: [Status]
- Dashboards: [Status]

## Suggested Starting Point
[Based on the context, suggest what to work on next]

## Ready to Start!
What would you like to work on today?
```

## Notes
- Be concise but thorough
- This is a demo/observability project, not a feature-development project
- Focus on configurations, testing, and documentation
- Highlight the most important/urgent items
- If there are blockers, mention them prominently
- Make it easy for the user to decide what to work on
