# Commit Command

Intelligently review git changes, group related modifications, and create well-organized commits with clear messages.

## What This Command Does

This command will:
1. Analyze all staged and unstaged changes in the git repository
2. Group related changes into logical commits
3. Create commits with clear, descriptive messages explaining the "why" not just the "what"
4. **Only commit changes** - it will NOT push to the remote repository

## How It Works

The command reviews:
- `git status` - to see what files have changed
- `git diff` - to understand the nature of each change
- `git log` - to follow the repository's commit message style

Then it intelligently:
- Groups related changes into logical commits (e.g., all refactoring together, all documentation together)
- Writes descriptive commit messages that explain the purpose of changes
- Uses conventional commit format for clarity
- Includes attribution: "Generated with Claude Code"

## Important Notes

- **No Push**: This command only commits to your local branch. Use `git push` separately when ready.
- **Staged Changes**: If you have already staged some files, the command respects those groupings
- **Unstaged Changes**: Any modified files will be staged and committed along with untracked files
- **Interactive**: You can review each commit message before it's created

## Example Usage

```
/commit
```

The command will then review your changes and create appropriately grouped commits.
