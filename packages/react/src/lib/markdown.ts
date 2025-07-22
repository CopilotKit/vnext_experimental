export function completePartialMarkdown(input: string): string {
  let s = input;

  // 1) Handle code fences - use FIRST unmatched fence for proper nesting
  const fenceMatches = Array.from(s.matchAll(/^(\s*)(`{3,}|~{3,})/gm));
  if (fenceMatches.length % 2 === 1) {
    // Use the FIRST fence for closing to handle nested scenarios properly
    // @ts-expect-error
    const [, indent, fence] = fenceMatches[0];
    s += `\n${indent}${fence}`;
  }

  // 2) Remove code block content to avoid processing markdown inside code
  const codeBlockRegex = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;
  const codeBlocks: string[] = [];
  const sWithoutCodeBlocks = s.replace(codeBlockRegex, (match) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 3) Also handle inline code early to avoid processing backticks inside
  const inlineCodeRegex = /`[^`]*`/g;
  const inlineCodes: string[] = [];
  const sWithoutInlineCode = sWithoutCodeBlocks.replace(
    inlineCodeRegex,
    (match) => {
      const placeholder = `__INLINE_CODE_${inlineCodes.length}__`;
      inlineCodes.push(match);
      return placeholder;
    }
  );

  // 4) Handle incomplete links and remove link brackets from bracket processing
  const incompleteLinkMatch = sWithoutInlineCode.match(
    /\[([^\]]*)\]\(([^)]*)$/
  );
  let processedString = sWithoutInlineCode;
  let linkText = "";
  let urlText = "";
  let hasIncompleteLink = false;

  if (incompleteLinkMatch) {
    hasIncompleteLink = true;
    linkText = incompleteLinkMatch[1] || "";
    urlText = incompleteLinkMatch[2] || "";
    // Remove the entire incomplete link for processing
    const linkStart = incompleteLinkMatch.index!;
    processedString =
      processedString.substring(0, linkStart) +
      "__INCOMPLETE_LINK_PLACEHOLDER__";
  }

  // 5) Stack-based parsing with emphasis handling
  interface OpenElement {
    type: string;
    marker: string;
    position: number;
  }

  const openElements: OpenElement[] = [];

  // Define patterns - process double patterns first to avoid conflicts
  const patterns = [
    { type: "bracket", marker: "[", closer: "]", regex: /\[/g },
    { type: "backtick", marker: "`", closer: "`", regex: /`/g },
    { type: "bold_star", marker: "**", closer: "**", regex: /\*\*/g },
    { type: "bold_underscore", marker: "__", closer: "__", regex: /__/g },
    { type: "strike", marker: "~~", closer: "~~", regex: /~~/g },
    {
      type: "italic_star",
      marker: "*",
      closer: "*",
      regex: /(?<!\*)\*(?!\*)/g,
    },
    {
      type: "italic_underscore",
      marker: "_",
      closer: "_",
      regex: /(?<!_)_(?!_)/g,
    },
  ];

  // Collect all pattern matches with positions
  const allMatches: Array<{
    type: string;
    marker: string;
    closer: string;
    position: number;
  }> = [];

  for (const pattern of patterns) {
    const matches = Array.from(processedString.matchAll(pattern.regex));
    for (const match of matches) {
      if (match.index !== undefined) {
        allMatches.push({
          type: pattern.type,
          marker: pattern.marker,
          closer: pattern.closer,
          position: match.index,
        });
      }
    }
  }

  // Sort by position to process in order
  allMatches.sort((a, b) => a.position - b.position);

  // Process matches to build stack
  for (const match of allMatches) {
    const existingIndex = openElements.findIndex(
      (el) => el.type === match.type
    );

    if (existingIndex !== -1) {
      // Found matching opening element - this closes it (LIFO removal)
      openElements.splice(existingIndex, 1);
    } else {
      // This is an opening element
      openElements.push({
        type: match.type,
        marker: match.marker,
        position: match.position,
      });
    }
  }

  // Close remaining open elements in reverse order (stack semantics)
  // Sort openElements by position to ensure proper LIFO closing order
  openElements.sort((a, b) => b.position - a.position);

  const closers = openElements.map((el) => {
    switch (el.type) {
      case "bracket":
        return "]";
      case "bold_star":
        return "**";
      case "bold_underscore":
        return "__";
      case "strike":
        return "~~";
      case "italic_star":
        return "*";
      case "italic_underscore":
        return "_";
      case "backtick":
        return "`";
      default:
        return "";
    }
  });

  let result = processedString + closers.join("");

  // 6) Restore incomplete link if it existed
  if (hasIncompleteLink) {
    result = result.replace(
      "__INCOMPLETE_LINK_PLACEHOLDER__",
      `[${linkText}](${urlText})`
    );
  }

  // 7) Restore inline code BEFORE processing parentheses
  for (let i = inlineCodes.length - 1; i >= 0; i--) {
    result = result.replace(`__INLINE_CODE_${i}__`, inlineCodes[i] || "");
  }

  // 8) Handle remaining unmatched backticks (not in inline code)
  const remainingBackticks = (result.match(/`/g) || []).length;
  if (remainingBackticks % 2 === 1) {
    result += "`";
  }

  // 9) Restore code blocks BEFORE processing parentheses
  for (let i = codeBlocks.length - 1; i >= 0; i--) {
    result = result.replace(`__CODE_BLOCK_${i}__`, codeBlocks[i] || "");
  }

  // 10) Handle parentheses ONLY if not inside code
  const finalFenceMatches = Array.from(
    result.matchAll(/^(\s*)(`{3,}|~{3,})/gm)
  );
  const hasUnclosedBacktick = (result.match(/`/g) || []).length % 2 === 1;
  const hasUnclosedCodeFence = finalFenceMatches.length % 2 === 1;

  // Also check if the last unclosed parenthesis is inside a backtick context
  let shouldCloseParens = !hasUnclosedBacktick && !hasUnclosedCodeFence;

  if (shouldCloseParens) {
    // Additional check: find the position of last unclosed paren and check if it's in code
    const lastOpenParen = result.lastIndexOf("(");
    if (lastOpenParen !== -1) {
      // Check if this paren is inside a backtick pair
      const beforeParen = result.substring(0, lastOpenParen);
      const backticksBeforeParen = (beforeParen.match(/`/g) || []).length;
      if (backticksBeforeParen % 2 === 1) {
        // Last paren is inside a backtick context, don't close it
        shouldCloseParens = false;
      }
    }
  }

  if (shouldCloseParens) {
    const openParens = (result.match(/\(/g) || []).length;
    const closeParens = (result.match(/\)/g) || []).length;
    if (openParens > closeParens) {
      result += ")".repeat(openParens - closeParens);
    }
  }

  return result;
}
