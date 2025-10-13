---
description: Add documentation for a new feature or capability
---

# New Feature Documentation

Add documentation for a new feature or capability to the project.

## Instructions

Ask the user for the feature/capability name and details if not already provided, then:

## 1. Determine Documentation Approach

For this observability demo project, features typically fall into these categories:
- **Configuration enhancements** (router, telemetry, etc.)
- **New subgraphs or services**
- **Monitoring/dashboard additions**
- **Testing scenarios**
- **Documentation improvements**

## 2. Create Session Notes

Create or update session notes at `docs/sessions/YYYY-MM-DD/notes.md` documenting:
- What capability is being added
- Why it's being added
- Configuration changes made
- Testing performed

## 3. Update README.md

Add the new capability/feature to the appropriate section in `README.md`:

- **Key Features** - If it's a major capability
- **Architecture** - If it affects the system design
- **Technology Stack** - If new tools are added
- **TODO** - If it's a planned enhancement

## 4. Update Configuration Files (if applicable)

Document changes in the relevant config files:
- `router/router.yaml` - Router configuration
- `docker-compose.yaml` - Service definitions
- `.env.sample` - New environment variables

## 5. Inform User

Tell the user:

```markdown
✅ Documented new capability: [Feature Name]

**Updated files:**
- [README.md](README.md) - Added to [section]
- [docs/sessions/YYYY-MM-DD/notes.md](docs/sessions/YYYY-MM-DD/notes.md) - Implementation notes

**Configuration changes:**
- [List any config files changed]

**Next steps:**
1. Test the new capability
2. Update wrap-up notes when complete
```

## Notes

- Keep documentation concise for this demo project
- Focus on "what" and "why" rather than exhaustive "how"
- Session notes are the primary documentation artifact
- README should reflect current capabilities accurately
- Don't create separate feature directories for this project type
