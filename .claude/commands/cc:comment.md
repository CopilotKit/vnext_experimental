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
This is their message:
#$ARGUMENTS

Write it up the user's intent into comment form and add it to the matching issue using the `gh` command.
It's important to formulate the user's message into a proper comment, especially if the user didn't provide a lot of details.
Think about the issue context and write clear instructions about what to do next.

**Always** end your comment by referencing @claude to trigger a response from Claude Code on GitHub.

If the user provided an issue number, attach your comment to that issue.

Otherwise, find the issue that mentions the current branch and attach your comment to that issue.

If neither issue number was provided nor a matching issue was found, ask the user to clarify.

That's all you should do, nothing else.
