---
allowed-tools: Bash(gh:*) Bash(git branch:*) Read Grep Glob LS WebFetch WebSearch
description: Create a new Claude Code issue
---

## Your context

Current branch:
!`git branch`

## Your task

The user wants to create a new Claude Code issue.
This is their message:
#$ARGUMENTS

Write it up the user's intent into issue form and add a new issue using the `gh` command.
It's important to formulate the user's message into a proper issue, especially if the user didn't provide a lot of details.
Think about the issue context and write clear instructions about the nature of the issue and what to do.
If needed, you can also add additional context by looking at specific files in the current codebase.

**Always**

1. Add the `claude-code` label to the issue
2. Mention @claude in the issue body

That's all you should do, nothing else.
