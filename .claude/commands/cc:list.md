---
allowed-tools: Bash(gh:*)
description: Summarize what Claude is working on
---

## Your context

!`gh issue list --label "claude-code" --state open --limit 100 --json number,title,body,comments`

## Your task

Look at the last comment from claude to learn about the status of claude's work.

Print a summary of each issue in this format:

# Issue [number]: "[title]"

[summary of the body]

Status: [status, using emojis: ✅, ⏳, ⚠️ and the word "done", "in progress", "blocked"]
Branch: `[branch name, if any and status is done]`

[short description of the current status, possibly considering the context of all comments in the issue]

[link to the issue]
