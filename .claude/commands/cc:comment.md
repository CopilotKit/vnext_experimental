---
allowed-tools: Bash(gh:*) Bash(git branch:*)
description: Comment on a Claude Code issue
---

## Your context

List of issues:
!`gh issue list --label "claude-code" --state open --limit 100 --json number,title,body,comments`

Current branch:
!`git branch`

## Your task

The user wants to give a comment on a Claude Code issue.
This is their comment:
#$ARGUMENTS

Write it up the user's intent into comment form and add it to the issue.

If the user provided an issue number, attach your comment to the issue.

Otherwise, find the issue that mentions the current branch and attach your comment to that issue.
